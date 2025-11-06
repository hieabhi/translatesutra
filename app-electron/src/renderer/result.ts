// Translation result window logic
interface TranslationData {
  translatedText: string;
  originalText: string;
  fromLanguage: string;
  toLanguage: string;
  service: string;
  confidence?: number;
}

let translationData: TranslationData | null = null;
let isPinned = false;

// DOM elements
const originalText = document.getElementById('originalText') as HTMLElement;
const translatedText = document.getElementById('translatedText') as HTMLElement;
const serviceIndicator = document.getElementById('serviceIndicator') as HTMLElement;
const languageIndicator = document.getElementById('languageIndicator') as HTMLElement;
const confidenceIndicator = document.getElementById('confidenceIndicator') as HTMLElement;
const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement;
const pinBtn = document.getElementById('pinBtn') as HTMLButtonElement;
const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupIPCListeners();
});

function setupEventListeners() {
  // Copy button
  copyBtn.addEventListener('click', handleCopy);
  
  // Pin button
  pinBtn.addEventListener('click', handlePin);
  
  // Close button
  closeBtn.addEventListener('click', handleClose);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyPress);
  
  // Prevent drag behavior on text content
  originalText.addEventListener('dragstart', (e) => e.preventDefault());
  translatedText.addEventListener('dragstart', (e) => e.preventDefault());
}

function setupIPCListeners() {
  // Listen for translation data from main process
  window.electronAPI.onTranslationData((data: TranslationData) => {
    translationData = data;
    displayTranslation(data);
  });
}

function displayTranslation(data: TranslationData) {
  // Update text content
  originalText.textContent = data.originalText;
  translatedText.textContent = data.translatedText;
  
  // Update service indicator
  const serviceNames: Record<string, string> = {
    'backend': 'TranslateSutra API',
    'libretranslate': 'LibreTranslate',
    'mock': 'Mock Service (Dev)',
    'placeholder': 'Demo Service'
  };
  
  serviceIndicator.textContent = serviceNames[data.service] || data.service;
  
  // Update language indicator
  const fromLang = data.fromLanguage === 'auto' ? 'AUTO' : data.fromLanguage.toUpperCase();
  const toLang = data.toLanguage.toUpperCase();
  languageIndicator.textContent = `${fromLang} → ${toLang}`;
  
  // Update confidence indicator
  if (data.confidence !== undefined) {
    const confidence = Math.round(data.confidence * 100);
    confidenceIndicator.textContent = `Confidence: ${confidence}%`;
    
    // Set confidence class based on value
    confidenceIndicator.className = 'confidence';
    if (confidence >= 80) {
      confidenceIndicator.classList.add('high');
    } else if (confidence >= 60) {
      confidenceIndicator.classList.add('medium');
    } else {
      confidenceIndicator.classList.add('low');
    }
  } else {
    confidenceIndicator.textContent = '';
  }
}

async function handleCopy() {
  if (!translationData) return;
  
  try {
    await window.electronAPI.copyToClipboard(translationData.translatedText);
    
    // Visual feedback
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✓ Copied!';
    copyBtn.classList.add('copied');
    
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove('copied');
    }, 2000);
    
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    
    // Fallback: show error feedback
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '❌ Failed';
    
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  }
}

async function handlePin() {
  try {
    isPinned = await window.electronAPI.pinResultWindow();
    
    if (isPinned) {
      pinBtn.classList.add('pinned');
      pinBtn.title = 'Unpin window';
    } else {
      pinBtn.classList.remove('pinned');
      pinBtn.title = 'Pin window';
    }
  } catch (error) {
    console.error('Failed to toggle pin state:', error);
  }
}

async function handleClose() {
  try {
    await window.electronAPI.closeResultWindow();
  } catch (error) {
    console.error('Failed to close window:', error);
    // Fallback: close the window forcefully
    window.close();
  }
}

function handleKeyPress(e: KeyboardEvent) {
  switch (e.key) {
    case 'Escape':
      handleClose();
      break;
      
    case 'c':
    case 'C':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handleCopy();
      }
      break;
      
    case 'p':
    case 'P':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handlePin();
      }
      break;
  }
}

// Auto-focus for accessibility
window.addEventListener('load', () => {
  // Focus the copy button for keyboard navigation
  copyBtn.focus();
});

// Handle window blur/focus for visual feedback
window.addEventListener('focus', () => {
  document.body.style.opacity = '1';
});

window.addEventListener('blur', () => {
  if (!isPinned) {
    document.body.style.opacity = '0.95';
  }
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  window.electronAPI.removeAllListeners('translation-data');
});