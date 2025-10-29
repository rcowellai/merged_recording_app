/**
 * errorUtils.js
 * -------------
 * Utilities for error tracking and logging
 *
 * PURPOSE:
 * Centralized error handling utilities for generating error IDs, logging errors,
 * and building error payloads for tracking services.
 *
 * FEATURES:
 * - Unique error ID generation with prefix support
 * - Error payload construction with context
 * - URL sanitization (removes sensitive query params)
 * - Backend error logging (placeholder for future integration)
 * - Environment-aware logging
 *
 * INTEGRATION:
 * - Used by AppErrorBoundary and FirebaseErrorBoundary
 * - Ready for Sentry/LogRocket integration
 * - Supports custom backend error logging endpoints
 */

/**
 * Generate unique error ID
 * @param {string} prefix - Error ID prefix (e.g., 'ERR', 'FB', 'APP')
 * @returns {string} Unique error ID (e.g., 'ERR-1698765432-ABC123XYZ')
 */
export function generateErrorId(prefix = 'ERR') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Log error to backend error tracking service
 * @param {Object} errorPayload - Error data to log
 * @returns {Promise<void>}
 *
 * INTEGRATION:
 * - Sentry: Sends errors to Sentry in production (if DSN configured)
 * - Custom: Can add additional logging endpoints as needed
 * - Console: Fallback logging for debugging
 */
export async function logErrorToBackend(errorPayload) {
  // Development mode: Log to console only
  if (process.env.NODE_ENV !== 'production') {
    console.log('📊 Error would be logged to Sentry (dev mode):', errorPayload);
    return;
  }

  try {
    // Send to Sentry (production only)
    if (window.Sentry && process.env.REACT_APP_SENTRY_DSN) {
      // Create Error object from payload for proper stack trace
      const error = errorPayload.error || new Error(errorPayload.message);

      // Capture exception with full context
      window.Sentry.captureException(error, {
        // Additional context
        extra: {
          errorId: errorPayload.errorId,
          componentStack: errorPayload.componentStack,
          appState: errorPayload.appState,
          url: errorPayload.url,
          timestamp: errorPayload.timestamp
        },

        // Tags for filtering in Sentry
        tags: {
          errorBoundary: errorPayload.errorBoundary,
          errorId: errorPayload.errorId,
          environment: errorPayload.environment
        },

        // User context
        user: errorPayload.userId ? {
          id: errorPayload.userId,
          sessionId: errorPayload.sessionId
        } : undefined,

        // Breadcrumbs (navigation history)
        contexts: {
          browser: errorPayload.browser,
          viewport: errorPayload.viewport
        },

        // Level
        level: errorPayload.severity || 'error'
      });

      console.log(`✅ Error logged to Sentry: ${errorPayload.errorId}`);
    } else {
      // Fallback: Console logging if Sentry not available
      console.error(`[Production Error] ${errorPayload.errorId}:`, errorPayload.message);
      console.error('Stack:', errorPayload.stack);
    }

    // Optional: Add custom backend logging here
    // await fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorPayload)
    // });

  } catch (e) {
    // Don't let error logging crash the app
    console.error('Failed to log error to Sentry:', e);
  }
}

/**
 * Sanitize URL (remove sensitive query params)
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL with sensitive params redacted
 */
export function sanitizeUrl(url) {
  try {
    const urlObj = new URL(url);
    const sensitiveParams = ['token', 'apiKey', 'api_key', 'password', 'secret', 'key', 'auth'];

    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });

    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Build error payload for logging
 * @param {Object} options - Error payload options
 * @param {string} options.errorId - Unique error ID
 * @param {Error} options.error - Error object
 * @param {Object} options.errorInfo - React errorInfo (componentStack)
 * @param {string} options.errorBoundary - Error boundary name
 * @param {string} options.userId - User ID (optional)
 * @param {string} options.sessionId - Session ID (optional)
 * @param {Object} options.appState - App state snapshot (optional)
 * @returns {Object} Complete error payload for logging
 */
export function buildErrorPayload({
  errorId,
  error,
  errorInfo,
  errorBoundary,
  userId = null,
  sessionId = null,
  appState = null
}) {
  return {
    // Error identification
    errorId,
    timestamp: new Date().toISOString(),

    // Error details
    message: error?.message || 'Unknown error',
    stack: error?.stack || null,
    componentStack: errorInfo?.componentStack || null,
    name: error?.name || 'Error',

    // Error classification
    errorBoundary,
    environment: process.env.NODE_ENV,

    // Context
    url: sanitizeUrl(window.location.href),
    pathname: window.location.pathname,
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    online: navigator.onLine,
    language: navigator.language,

    // User context
    userId,
    sessionId,

    // App state (sanitized - no sensitive data)
    appState: appState ? sanitizeAppState(appState) : null,

    // Browser info
    browser: {
      platform: navigator.platform,
      vendor: navigator.vendor,
      cookieEnabled: navigator.cookieEnabled
    }
  };
}

/**
 * Sanitize app state (remove sensitive data)
 * @param {Object} appState - App state object
 * @returns {Object} Sanitized app state
 */
function sanitizeAppState(appState) {
  // Create shallow copy
  const sanitized = { ...appState };

  // Remove sensitive keys
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'credentials'];
  sensitiveKeys.forEach(key => {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Get current session ID from window or generate new one
 * @returns {string} Session ID
 */
export function getSessionId() {
  // Check if session ID exists in window
  if (window.sessionId) {
    return window.sessionId;
  }

  // Try to get from sessionStorage
  const storedSessionId = sessionStorage.getItem('sessionId');
  if (storedSessionId) {
    window.sessionId = storedSessionId;
    return storedSessionId;
  }

  // Generate new session ID
  const newSessionId = generateErrorId('SESSION');
  sessionStorage.setItem('sessionId', newSessionId);
  window.sessionId = newSessionId;
  return newSessionId;
}
