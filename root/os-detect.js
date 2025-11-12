// OS Detection and Download Logic

// Detect user's operating system
function detectOS() {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();
  
  let osName = 'Unknown';
  let osPlatform = 'unknown';
  let architecture = 'x64';

  // Detect OS
  if (userAgent.includes('windows') || platform.includes('win')) {
    osName = 'Windows';
    osPlatform = 'windows';
  } else if (userAgent.includes('macintosh') || userAgent.includes('mac os') || platform.includes('mac')) {
    osName = 'macOS';
    osPlatform = 'macos';
  } else if (userAgent.includes('linux') || platform.includes('linux')) {
    osName = 'Linux';
    osPlatform = 'linux';
  }

  // Detect architecture (basic detection)
  if (userAgent.includes('x86_64') || userAgent.includes('amd64') || userAgent.includes('wow64')) {
    architecture = 'x64';
  } else if (userAgent.includes('arm64') || userAgent.includes('aarch64')) {
    architecture = 'arm64';
  } else if (userAgent.includes('arm')) {
    architecture = 'arm';
  } else if (userAgent.includes('i386') || userAgent.includes('i686')) {
    architecture = 'x86';
  }

  return {
    name: osName,
    platform: osPlatform,
    architecture: architecture
  };
}

// Get download links (in production, these would come from a release API)
function getDownloadLinks() {
  const baseUrl = 'https://github.com/hieabhi/translatesutra/releases/download/v1.0';
  
  return [
    // Windows
    {
      platform: 'windows',
      type: 'installer',
      filename: 'TranslateSutra-v1.0-Portable.zip',
      url: `${baseUrl}/TranslateSutra-v1.0-Portable.zip`,
      size: '~60 MB'
    },
    {
      platform: 'windows',
      type: 'portable',
      filename: 'TranslateSutra-v1.0-Portable.zip',
      url: `${baseUrl}/TranslateSutra-v1.0-Portable.zip`,
      size: '~60 MB'
    },
    
    // macOS
    {
      platform: 'macos',
      type: 'dmg',
      filename: 'TranslateSutra.dmg',
      url: `${baseUrl}/TranslateSutra.dmg`,
      size: '~50 MB'
    },
    {
      platform: 'macos',
      type: 'zip',
      filename: 'TranslateSutra-macOS.zip',
      url: `${baseUrl}/TranslateSutra-macOS.zip`,
      size: '~55 MB'
    },
    
    // Linux
    {
      platform: 'linux',
      type: 'appimage',
      filename: 'TranslateSutra.AppImage',
      url: `${baseUrl}/TranslateSutra.AppImage`,
      size: '~55 MB'
    },
    {
      platform: 'linux',
      type: 'deb',
      filename: 'TranslateSutra.deb',
      url: `${baseUrl}/TranslateSutra.deb`,
      size: '~45 MB'
    }
  ];
}

// Get primary download for detected OS
function getPrimaryDownload(osInfo) {
  const downloads = getDownloadLinks();
  
  // Primary download preferences by platform
  const preferences = {
    'windows': 'portable',
    'macos': 'dmg',
    'linux': 'appimage'
  };

  const preferredType = preferences[osInfo.platform];
  if (preferredType) {
    return downloads.find(d => d.platform === osInfo.platform && d.type === preferredType) || null;
  }

  return null;
}

// Update UI with detected OS information
function updateOSDetection() {
  const osInfo = detectOS();
  const primaryDownload = getPrimaryDownload(osInfo);
  
  // Update detected OS text
  const detectedOSElements = document.querySelectorAll('#detectedOS');
  detectedOSElements.forEach(element => {
    if (element) {
      element.textContent = osInfo.name;
    }
  });

  // Update download buttons
  const downloadButtons = document.querySelectorAll('.download-btn');
  downloadButtons.forEach(button => {
    if (button instanceof HTMLElement) {
      if (primaryDownload) {
        button.setAttribute('data-platform', osInfo.platform);
        button.setAttribute('data-filename', primaryDownload.filename);
        button.setAttribute('data-url', primaryDownload.url);
        // If this is an anchor tag, also set the href so native navigation works
        if (button.tagName && button.tagName.toLowerCase() === 'a') {
          try { button.setAttribute('href', primaryDownload.url); } catch (_) {}
        }
      }
    }
  });

  // Highlight the matching platform card
  const platformCards = document.querySelectorAll('.download-card');
  platformCards.forEach(card => {
    if (card instanceof HTMLElement) {
      if (card.getAttribute('data-platform') === osInfo.platform) {
        card.classList.add('recommended');
      }
    }
  });

  console.log('Detected OS:', osInfo);
  console.log('Primary download:', primaryDownload);
}

// Handle download click
function handleDownload(url, filename) {
  // Track download analytics (in production)
  console.log('Download started:', { url, filename });

  // IMPORTANT: Avoid cross-origin HEAD checks (blocked by CORS on GitHub assets).
  // Navigate directly to the asset URL so the browser handles the download.
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    // The download attribute is ignored cross-origin, but harmless.
    if (filename) a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    // Fallback to location change
    window.location.href = url;
  }
  showDownloadNotification(filename || 'TranslateSutra');
}

// Show build instructions when releases aren't available
function showBuildInstructions() {
  const modal = document.createElement('div');
  modal.className = 'build-instructions-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>🚀 TranslateSutra - Development Version</h3>
        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="modal-body">
        <p><strong>Pre-built installers are coming soon!</strong></p>
        <p>For now, you can build TranslateSutra from source:</p>
        <ol>
          <li>Visit our <a href="https://github.com/hieabhi/translatesutra" target="_blank">GitHub Repository</a></li>
          <li>Clone the repository: <code>git clone https://github.com/hieabhi/translatesutra.git</code></li>
          <li>Install dependencies: <code>npm install</code></li>
          <li>Build the Electron app: <code>cd app-electron && npm run build</code></li>
        </ol>
        <p>Or try the web version locally by following the setup instructions in the README.</p>
        <div class="modal-actions">
          <a href="https://github.com/hieabhi/translatesutra" target="_blank" class="btn-primary">View on GitHub</a>
          <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Show download notification
function showDownloadNotification(filename) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'download-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">⬇️</span>
      <span class="notification-text">Downloading ${filename}...</span>
      <button class="notification-close">×</button>
    </div>
  `;

  // Add notification styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  // Handle close button
  const closeBtn = notification.querySelector('.notification-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      notification.remove();
    });
  }

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// Setup download event listeners
function setupDownloadListeners() {
  // Primary download buttons
  const downloadButtons = document.querySelectorAll('.download-btn');
  downloadButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      // Prefer data-url (dynamic) else fall back to the element's href
      const dataUrl = button.getAttribute('data-url');
      const hrefUrl = (button instanceof HTMLAnchorElement) ? button.getAttribute('href') : null;
      const url = dataUrl || hrefUrl;
      const filename = button.getAttribute('data-filename') || 'TranslateSutra.zip';

      if (url) {
        // If we handle programmatically, prevent default to avoid double navigation
        e.preventDefault();
        handleDownload(url, filename);
      } // else allow default behavior if any
    });
  });

  // Individual download links
  const downloadLinks = document.querySelectorAll('.download-link');
  downloadLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const hrefUrl = link.getAttribute('href');
      const filename = link.getAttribute('data-file') || 'TranslateSutra.zip';
      // If link already has an absolute URL, let browser navigate; otherwise, compute from filename
      const isAbsolute = hrefUrl && /^(https?:)?\/\//i.test(hrefUrl);
      if (isAbsolute) {
        // Let the browser handle normal navigation — do not preventDefault
        return;
      }
      e.preventDefault();
      const downloads = getDownloadLinks();
      const download = downloads.find(d => d.filename === filename);
      if (download) {
        handleDownload(download.url, download.filename);
      } else {
        console.error('Download not found for filename:', filename);
        alert('Download not available. Please try again later.');
      }
    });
  });
}

// Get latest release info (for production)
async function getLatestReleaseInfo() {
  try {
    const response = await fetch('https://api.github.com/repos/hieabhi/translatesutra/releases/latest');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch release info:', error);
  }
  return null;
}

// Initialize OS detection
function initializeOSDetection() {
  updateOSDetection();
  setupDownloadListeners();
  
  // In production, you might want to fetch latest release info
  // getLatestReleaseInfo().then(release => {
  //   if (release) {
  //     console.log('Latest release:', release.tag_name);
  //     updateDownloadLinksWithRelease(release);
  //   }
  // });
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.OSDetection = {
    detectOS: detectOS,
    getDownloadLinks: getDownloadLinks,
    getPrimaryDownload: getPrimaryDownload,
    handleDownload: handleDownload,
    initialize: initializeOSDetection
  };
}