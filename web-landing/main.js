// Main JavaScript functionality for the landing page

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeNavigation();
  initializeScrollEffects();
  initializeAnimations();
  
  // Initialize OS detection from os-detect.js
  if (window.OSDetection) {
    window.OSDetection.initialize();
  }
  
  console.log('TranslateSutra landing page initialized');
});

// Navigation functionality
function initializeNavigation() {
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
    });
  }

  // Close mobile menu when clicking on links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        navMenu.style.display = 'none';
      }
    });
  });

  // Handle smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Scroll effects
function initializeScrollEffects() {
  const navbar = document.querySelector('.navbar');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      navbar.style.background = 'rgba(255, 255, 255, 0.98)';
      navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
      navbar.style.background = 'rgba(255, 255, 255, 0.95)';
      navbar.style.boxShadow = 'none';
    }
  });
}

// Animation effects
function initializeAnimations() {
  // Intersection Observer for fade-in animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observe elements for animation
  document.querySelectorAll('.feature-card, .download-card, .step').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

// Form handling for login/register (if forms exist)
function handleFormSubmission(formElement, endpoint) {
  formElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(formElement);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Handle successful response
        showNotification('Success!', 'success');
        
        // Redirect or update UI as needed
        if (result.accessToken) {
          localStorage.setItem('authToken', result.accessToken);
          window.location.href = '/dashboard.html';
        }
      } else {
        // Handle error response
        showNotification(result.message || 'An error occurred', 'error');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      showNotification('Network error. Please try again.', 'error');
    }
  });
}

// Notification system
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${getNotificationIcon(type)}</span>
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${getNotificationColor(type)};
    color: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 400px;
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

function getNotificationIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type] || icons.info;
}

function getNotificationColor(type) {
  const colors = {
    success: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
    error: 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)',
    warning: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
    info: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)'
  };
  return colors[type] || colors.info;
}

// Analytics tracking (placeholder)
function trackEvent(event, data = {}) {
  console.log('Analytics:', event, data);
  
  // In production, send to analytics service
  // Example: Google Analytics, Mixpanel, etc.
  if (typeof gtag !== 'undefined') {
    gtag('event', event, data);
  }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  // Handle keyboard shortcuts
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'k':
        e.preventDefault();
        // Focus search if available
        break;
      case '/':
        e.preventDefault();
        // Open command palette or search
        break;
    }
  }
  
  // Escape key handling
  if (e.key === 'Escape') {
    // Close any open modals or menus
    const openMenus = document.querySelectorAll('.nav-menu[style*="flex"]');
    openMenus.forEach(menu => {
      menu.style.display = 'none';
    });
  }
});

// Error handling
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  
  // In production, send to error tracking service
  // Example: Sentry, Bugsnag, etc.
});

// Performance monitoring
window.addEventListener('load', () => {
  // Measure page load performance
  if ('performance' in window) {
    const perfData = performance.getEntriesByType('navigation')[0];
    if (perfData) {
      console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
      
      // Track to analytics
      trackEvent('page_load_time', {
        duration: perfData.loadEventEnd - perfData.loadEventStart
      });
    }
  }
});

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Export functions for use in other scripts
window.TranslateSutraApp = {
  showNotification,
  trackEvent,
  handleFormSubmission,
  debounce,
  throttle
};