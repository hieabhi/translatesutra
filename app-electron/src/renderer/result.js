// Result window renderer logic
let currentTranslation = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupIPCListeners();
});

function setupEventListeners() {
  // Copy button functionality
  const copyButton = document.getElementById('copyButton');
  if (copyButton) {
    copyButton.addEventListener('click', handleCopyTranslation);
  }
  
  // Close button functionality
  const closeButton = document.getElementById('closeButton');
  if (closeButton) {
    closeButton.addEventListener('click', handleCloseWindow);
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      handleCloseWindow();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      handleCopyTranslation();
    }
  });
}

function setupIPCListeners() {
  // Listen for translation data from main process
  window.electronAPI.onTranslationData((data) => {
    currentTranslation = data;
    displayTranslation(data);
  });
}

function displayTranslation(data) {
  const originalTextElement = document.getElementById('originalText');
  const translatedTextElement = document.getElementById('translatedText');
  const languageInfoElement = document.getElementById('languageInfo');
  const confidenceElement = document.getElementById('confidence');

  // Display original text
  if (originalTextElement) {
    originalTextElement.textContent = data.originalText;
  }
  
  // Display translated text
  if (translatedTextElement) {
    translatedTextElement.textContent = data.translatedText;
  }
  
  // Display language information
  if (languageInfoElement) {
    languageInfoElement.textContent = `${data.fromLanguage} → ${data.toLanguage}`;
  }
  
  // Display confidence if available
  if (data.confidence && confidenceElement) {
    confidenceElement.textContent = `Confidence: ${Math.round(data.confidence * 100)}%`;
    confidenceElement.style.display = 'block';
  } else if (confidenceElement) {
    confidenceElement.style.display = 'none';
  }
}

async function handleCopyTranslation() {
  if (!currentTranslation) return;
  
  try {
    await window.electronAPI.copyToClipboard(currentTranslation.translatedText);
    
    // Show feedback
    const copyButton = document.getElementById('copyButton');
    if (copyButton) {
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      copyButton.disabled = true;
      
      setTimeout(() => {
        copyButton.textContent = originalText;
        copyButton.disabled = false;
      }, 1500);
    }
    
  } catch (error) {
    console.error('Failed to copy translation:', error);
  }
}

function handleCloseWindow() {
  window.electronAPI.closeResultWindow();
}

// Auto-close window after a timeout (optional)
let autoCloseTimeout;

function startAutoCloseTimer() {
  // Auto-close after 10 seconds of inactivity
  autoCloseTimeout = setTimeout(() => {
    handleCloseWindow();
  }, 10000);
}

function resetAutoCloseTimer() {
  if (autoCloseTimeout) {
    clearTimeout(autoCloseTimeout);
  }
  startAutoCloseTimer();
}

// Reset timer on user interaction
document.addEventListener('mousemove', resetAutoCloseTimer);
document.addEventListener('keypress', resetAutoCloseTimer);

// Start the timer when the window is shown
window.addEventListener('focus', () => {
  startAutoCloseTimer();
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (autoCloseTimeout) {
    clearTimeout(autoCloseTimeout);
  }
});