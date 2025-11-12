import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Clipboard
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),

  // Window management
  closeResultWindow: () => ipcRenderer.invoke('close-result-window'),
  pinResultWindow: () => ipcRenderer.invoke('pin-result-window'),
  hideFloatWindow: () => ipcRenderer.invoke('hide-float-window'),
  showFloatWindow: () => ipcRenderer.invoke('show-float-window'),
  
  // Context menu and actions
  showContextMenu: () => ipcRenderer.invoke('show-context-menu'),
  translateClipboard: () => ipcRenderer.invoke('translate-clipboard'),
  closeApp: () => ipcRenderer.invoke('close-app'),

  // Language picker
  closeLanguagePicker: () => ipcRenderer.invoke('close-language-picker'),
  requestLanguagePickerData: () => ipcRenderer.invoke('request-language-picker-data'),
  startTranslation: (data: { text: string; from?: string; to: string }) => 
    ipcRenderer.invoke('start-translation', data),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('set-setting', key, value),

  // Authentication
  saveAuthTokens: (tokens: { accessToken: string; refreshToken: string }) => 
    ipcRenderer.invoke('save-auth-tokens', tokens),
  getAuthTokens: () => ipcRenderer.invoke('get-auth-tokens'),
  clearAuthTokens: () => ipcRenderer.invoke('clear-auth-tokens'),

  // Events
  onTranslationData: (callback: (data: any) => void) => {
    ipcRenderer.on('translation-data', (event, data) => callback(data));
  },
  onShowTooltip: (callback: (message: string) => void) => {
    ipcRenderer.on('show-tooltip', (event, message) => callback(message));
  },
  onShowLoading: (callback: () => void) => {
    ipcRenderer.on('show-loading', () => callback());
  },
  onHideLoading: (callback: () => void) => {
    ipcRenderer.on('hide-loading', () => callback());
  },
  onLanguagePickerData: (callback: (data: any) => void) => {
    ipcRenderer.on('language-picker-data', (event, data) => callback(data));
  },
  onLanguageDetected: (callback: (data: any) => void) => {
    ipcRenderer.on('language-detected', (event, data) => callback(data));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Define types for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      copyToClipboard: (text: string) => Promise<void>;
      closeResultWindow: () => Promise<void>;
      pinResultWindow: () => Promise<boolean>;
      hideFloatWindow: () => Promise<void>;
      showFloatWindow: () => Promise<void>;
      getSetting: (key: string) => Promise<any>;
      setSetting: (key: string, value: any) => Promise<void>;
      saveAuthTokens: (tokens: { accessToken: string; refreshToken: string }) => Promise<boolean>;
      getAuthTokens: () => Promise<{ accessToken: string | null; refreshToken: string | null }>;
      clearAuthTokens: () => Promise<boolean>;
      onTranslationData: (callback: (data: any) => void) => void;
      onShowTooltip: (callback: (message: string) => void) => void;
      onShowLoading: (callback: () => void) => void;
      onHideLoading: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}