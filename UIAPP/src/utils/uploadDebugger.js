/**
 * Upload Debug Utilities
 * ======================
 * Comprehensive debugging utilities for Love Retold upload troubleshooting
 */

/**
 * Create a visible debug panel on the page for upload debugging
 */
export const createDebugPanel = () => {
  // Remove existing debug panel if it exists
  const existingPanel = document.getElementById('upload-debug-panel');
  if (existingPanel) {
    existingPanel.remove();
  }

  const debugPanel = document.createElement('div');
  debugPanel.id = 'upload-debug-panel';
  debugPanel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 300px;
    max-height: 400px;
    background: rgba(0, 0, 0, 0.9);
    color: #00ff00;
    font-family: monospace;
    font-size: 11px;
    padding: 10px;
    border-radius: 5px;
    z-index: 10000;
    overflow-y: auto;
    border: 2px solid #00ff00;
  `;

  const title = document.createElement('div');
  title.textContent = '🔍 UPLOAD DEBUG LOG';
  title.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: #ffff00;';
  debugPanel.appendChild(title);

  const logContainer = document.createElement('div');
  logContainer.id = 'debug-log-container';
  debugPanel.appendChild(logContainer);

  document.body.appendChild(debugPanel);
  
  return logContainer;
};

/**
 * Add a log entry to the debug panel
 */
export const addDebugLog = (message, data = null) => {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${message}`;
  
  console.log(logEntry, data);
  
  const logContainer = document.getElementById('debug-log-container');
  if (logContainer) {
    const logElement = document.createElement('div');
    logElement.textContent = logEntry;
    logElement.style.marginBottom = '3px';
    
    if (data) {
      const dataElement = document.createElement('div');
      dataElement.textContent = `  → ${JSON.stringify(data, null, 1).replace(/\n\s+/g, ' ')}`;
      dataElement.style.cssText = 'color: #888; margin-left: 10px; margin-bottom: 5px;';
      logContainer.appendChild(logElement);
      logContainer.appendChild(dataElement);
    } else {
      logContainer.appendChild(logElement);
    }
    
    // Auto-scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Limit log entries to prevent memory issues
    while (logContainer.children.length > 50) {
      logContainer.removeChild(logContainer.firstChild);
    }
  }
};

/**
 * Log upload step with clear status indicators
 */
export const logUploadStep = (step, status, details = null) => {
  const statusEmoji = {
    'start': '🚀',
    'success': '✅',
    'error': '❌',
    'warning': '⚠️',
    'info': 'ℹ️'
  };
  
  const emoji = statusEmoji[status] || '📋';
  addDebugLog(`${emoji} ${step}`, details);
};

/**
 * Initialize debug panel when page loads
 */
export const initializeUploadDebugging = () => {
  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createDebugPanel);
  } else {
    createDebugPanel();
  }
  
  // Add initial log entry
  setTimeout(() => {
    addDebugLog('🎯 Upload debugging initialized');
  }, 100);
};