/**
 * Debug Logger for Love Retold Recording App
 * Comprehensive logging system for troubleshooting
 */

class DebugLogger {
  constructor() {
    // Enable debug logging based on environment variable
    const debugMode = process.env.REACT_APP_DEBUG_MODE === 'true' ||
                     process.env.REACT_APP_DEBUG === 'true' ||
                     localStorage.getItem('debug-mode') === 'true';
    this.enabled = debugMode;
    this.context = 'UIAPP';
    this.startTime = Date.now();

    // Log initialization status
    if (this.enabled) {
      console.log('🐛 Debug logging ENABLED (REACT_APP_DEBUG_MODE=true)');
    } else {
      console.log('🔇 Debug logging DISABLED (set REACT_APP_DEBUG_MODE=true to enable)');
    }
  }

  enable() {
    this.enabled = true;
    localStorage.setItem('debug-mode', 'true');
    console.log('🐛 Debug logging enabled');
  }

  disable() {
    this.enabled = false;
    localStorage.removeItem('debug-mode');
    console.log('🐛 Debug logging disabled');
  }

  log(level, component, message, data = null, error = null) {
    if (!this.enabled) return;

    // FILTER: Only log ERROR and WARN levels, skip INFO and DEBUG to reduce console noise
    if (level === 'info' || level === 'debug') {
      return;
    }

    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;

    const logData = {
      timestamp,
      elapsed: `${elapsed}ms`,
      level: level.toUpperCase(),
      component,
      message,
      ...(data && { data }),
      ...(error && { error: error.message || error })
    };

    const prefix = `🐛 [${level.toUpperCase()}] ${component}:`;

    switch (level) {
      case 'error':
        console.error(prefix, message, logData);
        if (error) console.error('Error details:', error);
        break;
      case 'warn':
        console.warn(prefix, message, logData);
        break;
      default:
        // Fallback for any other level (shouldn't reach here due to filter above)
        console.log(prefix, message, logData);
    }

    // Store critical errors in localStorage for inspection
    if (level === 'error') {
      this.storeError(logData);
    }
  }

  storeError(errorData) {
    try {
      const errors = JSON.parse(localStorage.getItem('debug-errors') || '[]');
      errors.unshift(errorData);
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(50);
      }
      localStorage.setItem('debug-errors', JSON.stringify(errors));
    } catch (e) {
      console.warn('Failed to store error data:', e);
    }
  }

  getStoredErrors() {
    try {
      return JSON.parse(localStorage.getItem('debug-errors') || '[]');
    } catch (e) {
      return [];
    }
  }

  clearStoredErrors() {
    localStorage.removeItem('debug-errors');
    console.log('🐛 Stored errors cleared');
  }

  // Router logging
  routeMatched(path, params) {
    this.log('info', 'ROUTER', `Route matched: ${path}`, { params });
  }

  routeNotMatched(path) {
    this.log('warn', 'ROUTER', `Route not matched: ${path}`);
  }

  // Component lifecycle
  componentMounted(componentName, props = {}) {
    this.log('info', componentName, 'Component mounted', { props });
  }

  componentUnmounted(componentName) {
    this.log('info', componentName, 'Component unmounted');
  }

  componentError(componentName, error, errorInfo = {}) {
    this.log('error', componentName, 'Component error', errorInfo, error);
  }

  // Firebase logging
  firebaseInit(service) {
    this.log('info', 'FIREBASE', `${service} initializing`);
  }

  firebaseSuccess(service, operation, data = {}) {
    this.log('info', 'FIREBASE', `${service}.${operation} success`, data);
  }

  firebaseError(service, operation, error) {
    this.log('error', 'FIREBASE', `${service}.${operation} failed`, null, error);
  }

  // Session logging
  sessionParsing(sessionId, source) {
    this.log('info', 'SESSION', `Parsing session ID from ${source}`, { sessionId });
  }

  sessionValidation(sessionId, status) {
    this.log('info', 'SESSION', `Validation ${status}`, { sessionId });
  }

  // Network logging
  networkRequest(url, method = 'GET') {
    this.log('debug', 'NETWORK', `${method} ${url}`);
  }

  networkResponse(url, status, data = {}) {
    this.log('debug', 'NETWORK', `Response ${status}`, { url, ...data });
  }

  networkError(url, error) {
    this.log('error', 'NETWORK', `Request failed: ${url}`, null, error);
  }

  // Performance logging
  performanceMark(name) {
    this.log('debug', 'PERF', `Mark: ${name}`);
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
  }

  performanceMeasure(name, startMark, endMark) {
    if (typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name)[0];
        this.log('info', 'PERF', `${name}: ${measure.duration.toFixed(2)}ms`);
      } catch (e) {
        this.log('warn', 'PERF', `Failed to measure ${name}`, null, e);
      }
    }
  }
}

// Create singleton instance
const debugLogger = new DebugLogger();

// Expose to window for console access
if (typeof window !== 'undefined') {
  window.debugLogger = debugLogger;
  window.enableDebug = () => debugLogger.enable();
  window.disableDebug = () => debugLogger.disable();
  window.getDebugErrors = () => debugLogger.getStoredErrors();
  window.clearDebugErrors = () => debugLogger.clearStoredErrors();
}

export default debugLogger;