/**
 * 🚨 Error Reporter & Diagnostics
 * ================================
 *
 * Production-friendly error tracking and diagnostics system.
 * Stores errors locally for debugging and sends critical errors to Sentry.
 *
 * FEATURES:
 * - Local error log storage (last 50 errors)
 * - Automatic Sentry integration
 * - Remote diagnostics endpoint support
 * - Browser console access for debugging
 * - Context enrichment for errors
 *
 * BROWSER CONSOLE COMMANDS:
 * - window.__viewErrors()      - View all logged errors
 * - window.__clearErrors()     - Clear error log
 * - window.__sendDiagnostics() - Send diagnostics to support
 */

import { logger } from './logger';

const ERROR_LOG_KEY = 'LOVE_RETOLD_ERROR_LOG';
const MAX_ERRORS = 50;

/**
 * Get stored error log
 * @returns {Array} Array of error objects
 */
export function getErrorLog() {
  try {
    const log = localStorage.getItem(ERROR_LOG_KEY);
    return log ? JSON.parse(log) : [];
  } catch (error) {
    console.error('Failed to read error log:', error);
    return [];
  }
}

/**
 * Save error to local storage
 * @param {object} errorEntry - Error entry to save
 */
function saveError(errorEntry) {
  try {
    const log = getErrorLog();
    log.push(errorEntry);

    // Keep only last MAX_ERRORS entries
    const trimmedLog = log.slice(-MAX_ERRORS);

    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmedLog));
  } catch (error) {
    console.error('Failed to save error to log:', error);
  }
}

/**
 * Clear error log
 */
export function clearErrorLog() {
  try {
    localStorage.removeItem(ERROR_LOG_KEY);
    console.log('✅ Error log cleared');
  } catch (error) {
    console.error('Failed to clear error log:', error);
  }
}

/**
 * Sanitize error data to remove sensitive information
 * @param {any} data - Data to sanitize
 * @returns {any} Sanitized data
 */
function sanitizeData(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = { ...data };

  // Remove sensitive keys
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'secret',
    'authorization',
    'cookie',
    'sessionId'
  ];

  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  });

  return sanitized;
}

/**
 * Report an error with context
 * @param {Error|string} error - Error object or message
 * @param {object} context - Additional context
 * @param {string} severity - Error severity: 'low', 'medium', 'high', 'critical'
 */
export function reportError(error, context = {}, severity = 'medium') {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Sanitize context
  const sanitizedContext = sanitizeData(context);

  // Create error entry
  const errorEntry = {
    timestamp: new Date().toISOString(),
    message: errorMessage,
    stack: errorStack,
    context: sanitizedContext,
    severity,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Save to local storage
  saveError(errorEntry);

  // Log to console (uses production-safe logger)
  logger.error(errorMessage, error, sanitizedContext);

  // Send high/critical errors to Sentry
  if ((severity === 'high' || severity === 'critical') && window.Sentry) {
    window.Sentry.captureException(error instanceof Error ? error : new Error(errorMessage), {
      level: severity === 'critical' ? 'fatal' : 'error',
      contexts: {
        errorContext: sanitizedContext
      },
      tags: {
        severity
      }
    });
  }

  return errorEntry;
}

/**
 * Get browser capabilities and diagnostics
 * @returns {object} Diagnostic information
 */
export function getDiagnostics() {
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth
    },
    browserSupport: {
      mediaRecorder: !!window.MediaRecorder,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      webRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
      localStorage: (() => {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
          return true;
        } catch (e) {
          return false;
        }
      })(),
      indexedDB: !!window.indexedDB,
      serviceWorker: 'serviceWorker' in navigator,
      notifications: 'Notification' in window
    },
    mediaFormats: {
      webm: window.MediaRecorder ? MediaRecorder.isTypeSupported('video/webm') : false,
      mp4: window.MediaRecorder ? MediaRecorder.isTypeSupported('video/mp4') : false,
      webmCodecs: window.MediaRecorder ? MediaRecorder.isTypeSupported('video/webm;codecs=vp9') : false,
      h264: window.MediaRecorder ? MediaRecorder.isTypeSupported('video/mp4;codecs=h264') : false
    },
    errors: getErrorLog(),
    errorCount: getErrorLog().length,
    recentErrors: getErrorLog().slice(-5).map(e => ({
      timestamp: e.timestamp,
      message: e.message,
      severity: e.severity
    }))
  };
}

/**
 * Send diagnostics to support endpoint
 * @param {string} endpoint - API endpoint (optional)
 * @returns {Promise<object>} Response from server
 */
export async function sendDiagnostics(endpoint = '/api/diagnostics') {
  const diagnostics = getDiagnostics();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(diagnostics)
    });

    if (!response.ok) {
      throw new Error(`Failed to send diagnostics: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Diagnostics sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to send diagnostics:', error);
    throw error;
  }
}

/**
 * View errors in browser console
 * @param {number} limit - Number of recent errors to show (default: all)
 */
export function viewErrors(limit) {
  const errors = getErrorLog();

  if (errors.length === 0) {
    console.log('✅ No errors logged');
    return [];
  }

  const displayErrors = limit ? errors.slice(-limit) : errors;

  console.log(`📊 Showing ${displayErrors.length} of ${errors.length} total errors:`);
  console.table(
    displayErrors.map(e => ({
      timestamp: e.timestamp,
      message: e.message,
      severity: e.severity,
      url: e.url
    }))
  );

  // Show full details
  console.log('Full error details:', displayErrors);

  return displayErrors;
}

/**
 * Create error boundary handler for React
 * @param {object} errorInfo - React error boundary info
 * @returns {Function} Error handler
 */
export function createErrorBoundaryHandler(errorInfo = {}) {
  return (error, reactErrorInfo) => {
    reportError(error, {
      ...errorInfo,
      componentStack: reactErrorInfo.componentStack,
      errorBoundary: true
    }, 'high');
  };
}

// Expose functions globally for debugging
if (typeof window !== 'undefined') {
  window.__viewErrors = viewErrors;
  window.__clearErrors = clearErrorLog;
  window.__sendDiagnostics = sendDiagnostics;
  window.__getDiagnostics = getDiagnostics;

  // Show helper on initial load
  const errorCount = getErrorLog().length;
  if (errorCount > 0) {
    console.log(`⚠️ ${errorCount} errors logged. Run window.__viewErrors() to view.`);
  }
}

// Default export
export default {
  reportError,
  getErrorLog,
  clearErrorLog,
  getDiagnostics,
  sendDiagnostics,
  viewErrors,
  createErrorBoundaryHandler
};
