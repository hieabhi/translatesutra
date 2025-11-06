import { app, BrowserWindow, globalShortcut, Tray, Menu, screen, clipboard, ipcMain, shell } from 'electron';
import { join } from 'path';
import Store from 'electron-store';
import * as keytar from 'keytar';
import { translateText } from './utils/api';

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/../node_modules/.bin/electron`),
      hardResetMethod: 'exit'
    });
  } catch (e) {
    console.log('Electron reload not available');
  }
}

// Keep a global reference of the window objects
let floatWindow: BrowserWindow | null = null;
let resultWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Store for app settings
const store = new Store({
  defaults: {
    windowPosition: { x: 100, y: 100 },
    autoStart: false,
    hotkey: 'CommandOrControl+Shift+T',
    targetLanguage: 'en',
    sourceLanguage: 'auto',
    showNotifications: true,
    keepTranslationHistory: true,
  }
});

/**
 * Create the floating button window
 */
function createFloatWindow(): void {
  const { x, y } = store.get('windowPosition') as { x: number; y: number };
  
  floatWindow = new BrowserWindow({
    width: 120,
    height: 120,
    x,
    y,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      enableRemoteModule: false,
    },
  });

  floatWindow.loadFile(join(__dirname, '../src/renderer/floatButton.html'));

  floatWindow.once('ready-to-show', () => {
    floatWindow?.show();
  });

  // Make window draggable
  floatWindow.on('moved', () => {
    if (floatWindow) {
      const [x, y] = floatWindow.getPosition();
      store.set('windowPosition', { x, y });
    }
  });

  floatWindow.on('closed', () => {
    floatWindow = null;
  });

  // Handle window events
  floatWindow.webContents.on('dom-ready', () => {
    // Window is ready
  });
}

/**
 * Create translation result window
 */
function createResultWindow(translation: any, position?: { x: number; y: number }): void {
  // Close existing result window
  if (resultWindow) {
    resultWindow.close();
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const cursorPos = position || screen.getCursorScreenPoint();
  
  // Calculate window position to keep it on screen
  const windowWidth = 400;
  const windowHeight = 300;
  let x = cursorPos.x + 10;
  let y = cursorPos.y + 10;
  
  if (x + windowWidth > screenWidth) {
    x = screenWidth - windowWidth - 10;
  }
  if (y + windowHeight > screenHeight) {
    y = screenHeight - windowHeight - 10;
  }

  resultWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      enableRemoteModule: false,
    },
  });

  resultWindow.loadFile(join(__dirname, '../src/renderer/result.html'));

  resultWindow.once('ready-to-show', () => {
    resultWindow?.show();
    // Send translation data to renderer
    resultWindow?.webContents.send('translation-data', translation);
  });

  resultWindow.on('closed', () => {
    resultWindow = null;
  });

  // Auto-close after 15 seconds if not interacted with
  setTimeout(() => {
    if (resultWindow && !resultWindow.isDestroyed()) {
      resultWindow.close();
    }
  }, 15000);
}

/**
 * Handle translation hotkey
 */
async function handleTranslationHotkey(): Promise<void> {
  try {
    const text = clipboard.readText();
    
    if (!text || text.trim().length === 0) {
      // Show tooltip or notification
      if (floatWindow && !floatWindow.isDestroyed()) {
        floatWindow.webContents.send('show-tooltip', 'Select text or copy to clipboard');
      }
      return;
    }

    // Get current cursor position for result window
    const cursorPos = screen.getCursorScreenPoint();

    // Show loading state
    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.webContents.send('show-loading');
    }

    // Translate text
    const translation = await translateText(text);
    
    // Hide loading state
    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.webContents.send('hide-loading');
    }

    // Show result window
    createResultWindow(translation, cursorPos);

  } catch (error) {
    console.error('Translation error:', error);
    
    // Hide loading state
    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.webContents.send('hide-loading');
    }

    // Show error
    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.webContents.send('show-tooltip', 'Translation failed. Please try again.');
    }
  }
}

/**
 * Create system tray
 */
function createTray(): void {
  // TODO: Add actual icon file
  tray = new Tray(join(__dirname, '../assets/tray-icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Floating Button',
      click: () => {
        if (floatWindow) {
          floatWindow.show();
        } else {
          createFloatWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        // TODO: Open settings window
        shell.openExternal('http://localhost:3001/settings');
      }
    },
    {
      label: 'About',
      click: () => {
        shell.openExternal('https://github.com/translatesutra/translatesutra');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('TranslateSutra');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (floatWindow) {
      floatWindow.isVisible() ? floatWindow.hide() : floatWindow.show();
    } else {
      createFloatWindow();
    }
  });
}

/**
 * Register global shortcuts
 */
function registerShortcuts(): void {
  const hotkey = store.get('hotkey') as string;
  
  // Register translation hotkey
  const success = globalShortcut.register(hotkey, handleTranslationHotkey);
  
  if (!success) {
    console.error('Failed to register global shortcut:', hotkey);
  } else {
    console.log('Global shortcut registered:', hotkey);
  }
}

/**
 * App event handlers
 */
app.whenReady().then(() => {
  createFloatWindow();
  createTray();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createFloatWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isQuitting) {
    // Don't quit the app, just hide all windows
    return;
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

/**
 * IPC handlers
 */
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('copy-to-clipboard', (event, text: string) => {
  clipboard.writeText(text);
});

ipcMain.handle('close-result-window', () => {
  if (resultWindow) {
    resultWindow.close();
  }
});

ipcMain.handle('pin-result-window', () => {
  if (resultWindow) {
    resultWindow.setAlwaysOnTop(!resultWindow.isAlwaysOnTop());
    return resultWindow.isAlwaysOnTop();
  }
  return false;
});

ipcMain.handle('hide-float-window', () => {
  if (floatWindow) {
    floatWindow.hide();
  }
});

ipcMain.handle('show-float-window', () => {
  if (floatWindow) {
    floatWindow.show();
  }
});

// Settings management
ipcMain.handle('get-setting', (event, key: string) => {
  return store.get(key);
});

ipcMain.handle('set-setting', (event, key: string, value: any) => {
  store.set(key, value);
});

// Auth token management using keytar
ipcMain.handle('save-auth-tokens', async (event, tokens: { accessToken: string; refreshToken: string }) => {
  try {
    await keytar.setPassword('translatesutra', 'access_token', tokens.accessToken);
    await keytar.setPassword('translatesutra', 'refresh_token', tokens.refreshToken);
    return true;
  } catch (error) {
    console.error('Failed to save auth tokens:', error);
    return false;
  }
});

ipcMain.handle('get-auth-tokens', async () => {
  try {
    const accessToken = await keytar.getPassword('translatesutra', 'access_token');
    const refreshToken = await keytar.getPassword('translatesutra', 'refresh_token');
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Failed to get auth tokens:', error);
    return { accessToken: null, refreshToken: null };
  }
});

ipcMain.handle('clear-auth-tokens', async () => {
  try {
    await keytar.deletePassword('translatesutra', 'access_token');
    await keytar.deletePassword('translatesutra', 'refresh_token');
    return true;
  } catch (error) {
    console.error('Failed to clear auth tokens:', error);
    return false;
  }
});

// Export for testing
export { createFloatWindow, createResultWindow };