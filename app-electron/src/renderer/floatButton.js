// Float button renderer logic
let isLoading = false;
let tooltipTimeout = null;

const floatButton = document.getElementById('floatButton');
const loadingSpinner = document.getElementById('loadingSpinner');
const tooltip = document.getElementById('tooltip');

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupIPCListeners();
  updateHotkeyHint();
});

function setupEventListeners() {
  // Handle click events
  floatButton.addEventListener('click', handleButtonClick);
  floatButton.addEventListener('contextmenu', handleRightClick);
  
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
  window.electronAPI.onShowTooltip((message) => {
    showTooltip(message);
  });

  window.electronAPI.onShowLoading(() => {
    setLoading(true);
  });

  window.electronAPI.onHideLoading(() => {
    setLoading(false);
  });
}

async function handleButtonClick(e) {
  console.log('Button clicked!'); // Debug log
  e.preventDefault();
  e.stopPropagation();
  
  try {
    console.log('Checking electronAPI:', window.electronAPI); // Debug log
    
    // Direct translation on left click
    if (window.electronAPI && window.electronAPI.translateClipboard) {
      console.log('Calling translateClipboard...'); // Debug log
      showTooltip('Translating selected text...');
      setLoading(true);
      await window.electronAPI.translateClipboard();
      console.log('translateClipboard completed'); // Debug log
    } else {
      console.log('Translation API not available'); // Debug log
      showTooltip('Translation API not available');
    }
  } catch (error) {
    console.error('Button click error:', error);
    showTooltip('Error: ' + error.message);
  } finally {
    setLoading(false);
  }
}

async function handleRightClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  // Create context menu options
  const menuItems = [
    {
      label: 'Close',
      action: 'close-button'
    },
    {
      label: 'Settings',
      action: 'open-settings'
    },
    {
      label: 'About',
      action: 'open-about'
    }
  ];
  
  // Show custom context menu
  showContextMenu(e.pageX, e.pageY, menuItems);
}

function showContextMenu(x, y, items) {
  // Remove existing menu if any
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.cssText = `
    position: fixed;
    top: ${y}px;
    left: ${x}px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    z-index: 1000;
    min-width: 120px;
    font-size: 12px;
    overflow: hidden;
  `;

  items.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.textContent = item.label;
    menuItem.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      color: #333;
      transition: background-color 0.2s;
    `;
    
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    });
    
    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.backgroundColor = 'transparent';
    });

    menuItem.addEventListener('click', async () => {
      menu.remove();
      
      switch (item.action) {
        case 'close-button':
          try {
            await window.electronAPI.toggleFloatingButton();
          } catch (error) {
            console.error('Failed to close button:', error);
            showTooltip('Failed to close button');
          }
          break;
        case 'open-settings':
          showTooltip('Settings coming soon!');
          break;
        case 'open-about':
          showTooltip('TranslateSutra v1.0');
          break;
      }
    });

    menu.appendChild(menuItem);
  });

  document.body.appendChild(menu);

  // Close menu on click outside
  setTimeout(() => {
    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 10);
}

function setLoading(loading) {
  isLoading = loading;
  
  if (loading) {
    floatButton.classList.add('loading');
    loadingSpinner.classList.add('show');
  } else {
    floatButton.classList.remove('loading');
    loadingSpinner.classList.remove('show');
  }
}

function showTooltip(message) {
  tooltip.textContent = message;
  tooltip.classList.add('show');
  
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
  }
  
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
    const hotkeyHint = document.querySelector('.hotkey-hint');
    
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
  if (window.electronAPI && window.electronAPI.removeAllListeners) {
    window.electronAPI.removeAllListeners('show-tooltip');
    window.electronAPI.removeAllListeners('show-loading');
    window.electronAPI.removeAllListeners('hide-loading');
  }
});