import { app, BrowserWindow, globalShortcut, Tray, Menu, screen, clipboard, ipcMain, shell, dialog, nativeImage } from 'electron';
import { URL } from 'url';
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
let languagePickerWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let pendingDeepLink: string | null = null;

// Store selected text for translation
let selectedTextForTranslation = '';

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
 * Create language picker window
 */
function createLanguagePickerWindow(): void {
  console.log('=== Creating language picker window ===');
  
  // Close existing language picker
  if (languagePickerWindow) {
    console.log('Closing existing language picker');
    languagePickerWindow.close();
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const cursorPos = screen.getCursorScreenPoint();
  console.log('Screen size:', screenWidth, 'x', screenHeight);
  console.log('Cursor position:', cursorPos);
  
  // Calculate window position to keep it on screen
  const windowWidth = 350;
  const windowHeight = 500;
  let x = cursorPos.x - windowWidth / 2;
  let y = cursorPos.y - windowHeight / 2;
  
  if (x + windowWidth > screenWidth) {
    x = screenWidth - windowWidth - 10;
  }
  if (x < 10) {
    x = 10;
  }
  if (y + windowHeight > screenHeight) {
    y = screenHeight - windowHeight - 10;
  }
  if (y < 10) {
    y = 10;
  }

  console.log('Language picker window position:', x, y);

  try {
    languagePickerWindow = new BrowserWindow({
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
      },
    });

    console.log('BrowserWindow created successfully');

    const htmlPath = join(__dirname, '../src/renderer/languagePicker.html');
    console.log('Loading HTML file:', htmlPath);
    
    languagePickerWindow.loadFile(htmlPath);

    languagePickerWindow.once('ready-to-show', () => {
      console.log('Language picker ready to show');
      languagePickerWindow?.show();
      console.log('Language picker shown');
      
      // Send selected text data to renderer
      languagePickerWindow?.webContents.send('language-picker-data', {
        text: selectedTextForTranslation,
        detectedLanguage: 'auto' // Will be detected later
      });
      console.log('Data sent to language picker');
    });

    languagePickerWindow.on('closed', () => {
      console.log('Language picker window closed');
      languagePickerWindow = null;
    });

    languagePickerWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Language picker failed to load:', errorCode, errorDescription, validatedURL);
    });

  } catch (error) {
    console.error('Failed to create language picker window:', error);
  }
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
 * Send Ctrl+C keypress to copy selected text
 */
function sendCopyKeypress(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (process.platform === 'win32') {
        // Use Windows SendInput API via child_process
        const { exec } = require('child_process');
        exec('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\\"^c\\")"', 
        { windowsHide: true }, (error, stdout, stderr) => {
          if (error) {
            console.error('Copy keypress error:', error);
          }
          resolve();
        });
      } else {
        // For other platforms, we'll need different approach
        console.log('Copy keypress not implemented for this platform');
        resolve();
      }
    } catch (error) {
      console.error('Failed to send copy keypress:', error);
      resolve();
    }
  });
}

/**
 * Handle translation trigger: try to capture currently selected text by simulating Ctrl+C,
 * without permanently altering the user's clipboard. Falls back to existing clipboard if needed.
 */
async function handleTranslationHotkey(): Promise<void> {
  console.log('=== Translation started ===');
  try {
    const originalClipboard = clipboard.readText();
    const beforeHash = hashString(originalClipboard || '');

    // Attempt to copy current selection (Windows only in this implementation)
    await sendCopyKeypress();

    // Poll the clipboard briefly for a change
    const copied = await waitForClipboardChange(beforeHash, 600);
    const candidate = (copied ?? '').trim();

    let text = candidate && candidate.length > 0 ? candidate : (originalClipboard || '').trim();

    // Restore original clipboard so we don't disturb user's clipboard history
    try { clipboard.writeText(originalClipboard || ''); } catch {}

    if (!text || text.length < 3) {
      console.log('No selection detected and clipboard empty/too short');
      if (floatWindow && !floatWindow.isDestroyed()) {
        floatWindow.webContents.send('hide-loading');
        floatWindow.webContents.send('show-tooltip', 'Select text in any app, then click the button');
      }
      return;
    }

    console.log('Using text for translation:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    selectedTextForTranslation = text;

    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.webContents.send('hide-loading');
    }

    // Show language picker window and detect language
    await createLanguagePickerWindowWithDetection();
  } catch (error) {
    console.error('Translation setup error:', error);
    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.webContents.send('hide-loading');
      floatWindow.webContents.send('show-tooltip', 'Could not read selected text. Try selecting text and clicking again.');
    }
  }
}

/**
 * Wait for clipboard text to change compared to a baseline hash, up to timeoutMs.
 */
function waitForClipboardChange(beforeHash: string, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const current = clipboard.readText();
      const currentHash = hashString(current || '');
      if (currentHash !== beforeHash && (current || '').length > 0) {
        clearInterval(interval);
        resolve(current);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve(null);
      }
    }, 120);
  });
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit int
  }
  return String(hash);
}

/**
 * Create language picker window and detect language
 */
async function createLanguagePickerWindowWithDetection(): Promise<void> {
  createLanguagePickerWindow();
  
  // Detect language in the background
  try {
    console.log('Detecting language for text:', selectedTextForTranslation.substring(0, 100));
    
    const response = await fetch('http://localhost:3000/api/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: selectedTextForTranslation
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Language detection result:', result);
      
      // Update the language picker with detected language
      if (languagePickerWindow && !languagePickerWindow.isDestroyed()) {
        languagePickerWindow.webContents.send('language-detected', {
          detectedLanguage: result.detectedLanguage,
          confidence: result.confidence
        });
      }
    } else {
      console.error('Language detection API error:', response.status);
    }
  } catch (error) {
    console.error('Language detection failed:', error);
    // Continue without detection - user can still translate
  }
}

/**
 * Perform actual translation with backend
 */
async function performTranslation(text: string, fromLang: string = 'auto', toLang: string = 'en'): Promise<void> {
  try {
    console.log('Performing translation:', { text: text.substring(0, 50), fromLang, toLang });

    // Call backend translation API
    const response = await fetch('http://localhost:3000/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        from: fromLang === 'auto' ? undefined : fromLang,
        to: toLang
      })
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const translation = await response.json();
    console.log('Translation result:', translation);

    // Close language picker
    if (languagePickerWindow) {
      languagePickerWindow.close();
    }

    // Show result window
    createResultWindow(translation);

  } catch (error) {
    console.error('Translation error:', error);
    
    // Show error in language picker or float button
    if (languagePickerWindow && !languagePickerWindow.isDestroyed()) {
      languagePickerWindow.webContents.send('translation-error', error.message);
    } else if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.webContents.send('show-tooltip', 'Translation failed: ' + error.message);
    }
  }
}



/**
 * Create tray context menu
 */
function createTrayMenu(): void {
  if (!tray) return;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open TranslateSutra',
      click: () => {
        if (floatWindow && !floatWindow.isDestroyed()) {
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
    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.show();
    } else {
      createFloatWindow();
    }
  });
}

/**
 * Create system tray
 */
function createTray(): void {
  // Create a simple tray icon from base64 data
  const iconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFXSURXwElEQVQ4T42TPU7DQBCFZ+1kcgFaJFqKFBAKBQ2iQKKgoaGhoqOjpaWkpKGhpKGgpKSkoKGkoaGgpKSkoKGkoaGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoaGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGgoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGkoKGgpKSgoKGkoaGgoAAAAElFTkSuQmCC';
  
  try {
    const icon = nativeImage.createFromDataURL(iconBase64);
    tray = new Tray(icon);
    console.log('Tray created with custom icon');
  } catch (error) {
    console.log('Failed to create tray icon, using empty icon');
    const emptyIcon = nativeImage.createEmpty();
    tray = new Tray(emptyIcon);
  }
  
  createTrayMenu();
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
// Ensure single instance to route deep links properly
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', (_event, argv) => {
  // Windows: protocol URL will be in argv on second instance
  const deeplinkArg = argv.find(a => a.startsWith('translatesutra://'));
  if (deeplinkArg) {
    handleDeepLink(deeplinkArg);
  }
});

// macOS: open-url event
app.on('open-url', (_event, urlStr) => {
  handleDeepLink(urlStr);
});

app.whenReady().then(() => {
  // Register custom protocol (works best in packaged app)
  try {
    app.setAsDefaultProtocolClient('translatesutra');
  } catch (e) {
    console.log('Protocol registration failed (dev mode likely):', e);
  }
  createFloatWindow();
  
  try {
    createTray();
  } catch (error) {
    console.log('Skipping tray creation:', error);
  }
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createFloatWindow();
    }
  });

  // If app was launched with a deeplink (Windows first run), parse it
  if (process.platform === 'win32') {
    const deeplinkArg = process.argv.find(a => a.startsWith('translatesutra://'));
    if (deeplinkArg) {
      pendingDeepLink = deeplinkArg;
      setTimeout(() => {
        if (pendingDeepLink) {
          handleDeepLink(pendingDeepLink);
          pendingDeepLink = null;
        }
      }, 500);
    }
  }
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

ipcMain.handle('close-app', () => {
  isQuitting = true;
  app.quit();
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

// Context menu handler
ipcMain.handle('show-context-menu', () => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Translate Clipboard',
      click: () => {
        handleTranslationHotkey();
      }
    },
    {
      label: 'Show/Hide Float Button',
      click: () => {
        if (floatWindow && !floatWindow.isDestroyed()) {
          if (floatWindow.isVisible()) {
            floatWindow.hide();
          } else {
            floatWindow.show();
          }
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Settings',
      click: () => {
        // TODO: Open settings window
        console.log('Settings clicked');
      }
    },
    {
      label: 'About TranslateSutra',
      click: () => {
        dialog.showMessageBox(floatWindow!, {
          type: 'info',
          title: 'About TranslateSutra',
          message: 'TranslateSutra v1.0.0',
          detail: 'A floating desktop translator with global hotkey support.\n\nPress Ctrl+Shift+T to translate clipboard text.',
          buttons: ['OK']
        });
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      role: 'quit'
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: floatWindow! });
});

// Direct clipboard translation handler
ipcMain.handle('translate-clipboard', async () => {
  console.log('translate-clipboard IPC handler called'); // Debug log
  try {
    await handleTranslationHotkey();
  } catch (error) {
    console.error('Clipboard translation error:', error);
    throw error;
  }
});

// Language picker handlers
ipcMain.handle('close-language-picker', () => {
  if (languagePickerWindow) {
    languagePickerWindow.close();
  }
});

ipcMain.handle('request-language-picker-data', () => {
  if (languagePickerWindow && !languagePickerWindow.isDestroyed()) {
    languagePickerWindow.webContents.send('language-picker-data', {
      text: selectedTextForTranslation,
      detectedLanguage: 'auto'
    });
  }
});

ipcMain.handle('start-translation', async (event, data: { text: string; from?: string; to: string }) => {
  try {
    await performTranslation(data.text, data.from, data.to);
  } catch (error) {
    console.error('Translation start error:', error);
    throw error;
  }
});

// Export for testing
export { createFloatWindow, createResultWindow };

/**
 * Handle translatesutra:// deep links
 * Supported:
 * - translatesutra://open
 * - translatesutra://translate?text=Hello%20world&to=es&from=en
 */
function handleDeepLink(urlStr: string) {
  try {
    const url = new URL(urlStr);
    const action = url.hostname || 'open';
    if (action === 'open') {
      if (floatWindow && !floatWindow.isDestroyed()) {
        floatWindow.show();
      } else {
        createFloatWindow();
      }
      return;
    }

    if (action === 'translate') {
      const text = decodeURIComponent(url.searchParams.get('text') || '');
      const to = url.searchParams.get('to') || 'en';
      const from = url.searchParams.get('from') || 'auto';
      if (text && text.trim().length > 0) {
        selectedTextForTranslation = text;
        // Show language picker with provided defaults, then translate
        createLanguagePickerWindow();
        performTranslation(text, from, to);
      } else {
        // No text provided, just focus the app
        if (floatWindow && !floatWindow.isDestroyed()) {
          floatWindow.show();
        } else {
          createFloatWindow();
        }
      }
      return;
    }

    // Unknown action: just bring app to front
    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.show();
    } else {
      createFloatWindow();
    }
  } catch (err) {
    console.error('Failed to handle deep link:', urlStr, err);
  }
}