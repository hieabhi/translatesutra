// Float button renderer logic
let isLoading = false;
let tooltipTimeout: NodeJS.Timeout | null = null;

const floatButton = document.getElementById('floatButton') as HTMLElement;
const loadingSpinner = document.getElementById('loadingSpinner') as HTMLElement;
const tooltip = document.getElementById('tooltip') as HTMLElement;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupIPCListeners();
  updateHotkeyHint();
});

function setupEventListeners() {
  // Handle click events
  floatButton.addEventListener('click', handleButtonClick);
  
  // Handle drag functionality (this will be handled by Electron's drag region)
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  floatButton.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      // The actual window movement is handled by Electron
      // This just prevents the click event from firing after drag
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

function setupIPCListeners() {
  // Listen for events from main process
  window.electronAPI.onShowTooltip((message: string) => {
    showTooltip(message);
  });

  window.electronAPI.onShowLoading(() => {
    setLoading(true);
  });

  window.electronAPI.onHideLoading(() => {
    setLoading(false);
  });
}

async function handleButtonClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  
  // Show a context menu or perform default action
  try {
    // For now, we'll just trigger the translation hotkey functionality
    // In a full implementation, this could open a context menu
    showTooltip('Use Ctrl+Shift+T to translate text');
  } catch (error) {
    console.error('Button click error:', error);
  }
}

function setLoading(loading: boolean) {
  isLoading = loading;
  
  if (loading) {
    floatButton.classList.add('loading');
    loadingSpinner.classList.add('show');
  } else {
    floatButton.classList.remove('loading');
    loadingSpinner.classList.remove('show');
  }
}

function showTooltip(message: string) {
  tooltip.textContent = message;
  tooltip.classList.add('show');
  
  // Clear existing timeout
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
  }
  
  // Auto-hide tooltip after 3 seconds
  tooltipTimeout = setTimeout(() => {
    hideTooltip();
  }, 3000);
}

function hideTooltip() {
  tooltip.classList.remove('show');
  
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }
}

async function updateHotkeyHint() {
  try {
    const platform = await window.electronAPI.getPlatform();
    const hotkeyHint = document.querySelector('.hotkey-hint') as HTMLElement;
    
    if (platform === 'darwin') {
      hotkeyHint.textContent = 'Cmd+Shift+T';
    } else {
      hotkeyHint.textContent = 'Ctrl+Shift+T';
    }
  } catch (error) {
    console.error('Failed to update hotkey hint:', error);
  }
}

// Handle window focus/blur for visual feedback
window.addEventListener('focus', () => {
  floatButton.style.opacity = '1';
});

window.addEventListener('blur', () => {
  floatButton.style.opacity = '0.8';
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  window.electronAPI.removeAllListeners('show-tooltip');
  window.electronAPI.removeAllListeners('show-loading');
  window.electronAPI.removeAllListeners('hide-loading');
});