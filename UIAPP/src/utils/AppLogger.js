/**
 * Unified App Logger for Love Retold Recording App
 * ================================================
 * Consolidates all logging functionality into a single, lightweight system
 * 
 * Replaces:
 * - SafeConsoleController (console control)
 * - debugLogger (lifecycle logging)
 * - uploadErrorTracker (error storage)
 * - firebaseErrorHandler (error mapping)
 * 
 * Features:
 * - Admin-controlled console output
 * - Error persistence for debugging
 * - Component lifecycle tracking
 * - Service initialization logging
 * - Consistent API across entire app
 */

class AppLogger {
  constructor() {
    // Configuration
    this.CONSOLE_STATE_KEY = 'admin-console-debug-enabled'; // Keep existing key for compatibility
    this.ERRORS_KEY = 'loveRetoldUploadErrors'; // Keep existing key for compatibility
    this.MAX_STORED_ERRORS = 50;
    this.LOG_LEVELS = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    // State
    this.enabled = null;
    this.errors = [];
    this.originalConsole = {};
    this.isInitialized = false;
    this.currentLevel = this.LOG_LEVELS.info;
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize the logger system
   */
  initialize() {
    try {
      // Load console state from localStorage
      this.enabled = this.loadConsoleState();
      
      // Load stored errors
      this.errors = this.loadStoredErrors();
      
      // Preserve original console methods
      this.preserveConsole();
      
      // Apply initial console state
      if (this.enabled === false) {
        this.suppressConsole();
      }
      
      this.isInitialized = true;
    } catch (error) {
      // Fail safe - keep console enabled on error
      this.enabled = true;
      console.error('AppLogger initialization failed:', error);
    }
  }

  /**
   * Deferred initialization (called after app startup)
   * Ensures console state is applied after initial logging
   */
  deferredInit() {
    if (!this.isInitialized) {
      this.initialize();
    }
    
    // Re-apply console state to catch any startup logs
    if (this.enabled === false) {
      this.suppressConsole();
    }
  }

  // ============================================================================
  // CORE LOGGING API
  // ============================================================================

  /**
   * Debug level logging
   */
  debug(source, message, data = null) {
    this.log('debug', source, message, data);
  }

  /**
   * Info level logging
   */
  info(source, message, data = null) {
    this.log('info', source, message, data);
  }

  /**
   * Warning level logging
   */
  warn(source, message, data = null) {
    this.log('warn', source, message, data);
  }

  /**
   * Error level logging with persistence
   */
  error(source, message, data = null, error = null) {
    this.log('error', source, message, data, error);
    this.storeError(source, message, data, error);
  }

  /**
   * Component lifecycle logging
   */
  lifecycle(component, event, data = null) {
    this.log('info', component, `Component ${event}`, data);
  }

  /**
   * Service initialization logging
   */
  service(name, message, features = null) {
    if (this.shouldLogInit()) {
      this.log('info', name, message, features);
    }
  }

  // ============================================================================
  // ADMIN CONTROLS
  // ============================================================================

  /**
   * Enable console logging
   */
  enable() {
    try {
      this.enabled = true;
      this.saveConsoleState(true);
      this.restoreConsole();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Disable console logging
   */
  disable() {
    try {
      this.enabled = false;
      this.saveConsoleState(false);
      this.suppressConsole();
      return { success: true };
    } catch (error) {
      this.restoreConsole(); // Fail safe
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current logger state
   */
  getState() {
    return {
      isEnabled: this.enabled,
      isInitialized: this.isInitialized,
      errorCount: this.errors.length,
      logLevel: Object.keys(this.LOG_LEVELS).find(
        key => this.LOG_LEVELS[key] === this.currentLevel
      ),
      browserSupport: this.checkBrowserSupport()
    };
  }

  /**
   * Get stored errors for admin interface
   */
  getErrors() {
    return [...this.errors]; // Return copy
  }

  /**
   * Get error summary for admin dashboard
   */
  getSummary() {
    const summary = {
      totalErrors: 0,
      totalWarnings: 0,
      totalInfo: 0,
      bySource: {},
      recentErrors: []
    };

    this.errors.forEach(error => {
      if (error.level === 'error') summary.totalErrors++;
      else if (error.level === 'warn') summary.totalWarnings++;
      else if (error.level === 'info') summary.totalInfo++;
      
      // Group by source
      if (!summary.bySource[error.source]) {
        summary.bySource[error.source] = 0;
      }
      summary.bySource[error.source]++;
    });

    // Get 5 most recent errors
    summary.recentErrors = this.errors
      .filter(e => e.level === 'error')
      .slice(-5)
      .reverse();

    return summary;
  }

  /**
   * Clear all stored errors
   */
  clearErrors() {
    try {
      this.errors = [];
      localStorage.removeItem(this.ERRORS_KEY);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Export errors for debugging
   */
  exportErrors() {
    return {
      timestamp: new Date().toISOString(),
      errors: this.errors,
      summary: this.getSummary(),
      state: this.getState()
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Core logging implementation
   */
  log(level, source, message, data = null, error = null) {
    // Check if logging is enabled and level is appropriate
    if (!this.enabled && level !== 'error') return;
    if (this.LOG_LEVELS[level] < this.currentLevel) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      source,
      message,
      ...(data && { data }),
      ...(error && { error: this.serializeError(error) })
    };

    // Output to console if available
    if (this.enabled && this.originalConsole[level]) {
      const prefix = this.getLogPrefix(level, source);
      const args = [prefix, message];
      if (data) args.push(data);
      if (error) args.push(error);
      
      this.originalConsole[level](...args);
    }

    return logEntry;
  }

  /**
   * Store error for admin review
   */
  storeError(source, message, data, error) {
    try {
      const errorEntry = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        level: 'error',
        source,
        message,
        data,
        error: error ? this.serializeError(error) : null,
        // Browser context
        browser: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          online: navigator.onLine
        }
      };

      // Add to errors array
      this.errors.push(errorEntry);

      // Limit stored errors
      if (this.errors.length > this.MAX_STORED_ERRORS) {
        this.errors = this.errors.slice(-this.MAX_STORED_ERRORS);
      }

      // Persist to localStorage
      this.persistErrors();
    } catch (err) {
      // Fail silently to avoid infinite loops
    }
  }

  /**
   * Check if initialization logging should occur
   */
  shouldLogInit() {
    // During initialization, check localStorage directly
    if (!this.isInitialized) {
      try {
        const stored = localStorage.getItem(this.CONSOLE_STATE_KEY);
        if (stored !== null) {
          return JSON.parse(stored) !== false;
        }
      } catch {}
      return true; // Default to enabled
    }
    return this.enabled;
  }

  /**
   * Load console state from localStorage
   */
  loadConsoleState() {
    try {
      const stored = localStorage.getItem(this.CONSOLE_STATE_KEY);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load console state:', error);
    }
    return true; // Default to enabled
  }

  /**
   * Save console state to localStorage
   */
  saveConsoleState(state) {
    try {
      localStorage.setItem(this.CONSOLE_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save console state:', error);
    }
  }

  /**
   * Load errors from localStorage
   */
  loadStoredErrors() {
    try {
      const stored = localStorage.getItem(this.ERRORS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('Failed to load stored errors:', error);
    }
    return [];
  }

  /**
   * Persist errors to localStorage
   */
  persistErrors() {
    try {
      localStorage.setItem(this.ERRORS_KEY, JSON.stringify(this.errors));
    } catch (error) {
      // Fail silently
    }
  }

  /**
   * Preserve original console methods
   */
  preserveConsole() {
    ['log', 'debug', 'info', 'warn', 'error'].forEach(method => {
      if (console && typeof console[method] === 'function') {
        this.originalConsole[method] = console[method].bind(console);
      }
    });
  }

  /**
   * Suppress console output
   */
  suppressConsole() {
    ['log', 'debug', 'info', 'warn', 'error'].forEach(method => {
      if (console) {
        console[method] = () => {}; // No-op function
      }
    });
  }

  /**
   * Restore original console methods
   */
  restoreConsole() {
    Object.keys(this.originalConsole).forEach(method => {
      if (console && this.originalConsole[method]) {
        console[method] = this.originalConsole[method];
      }
    });
  }

  /**
   * Get log prefix based on level and source
   */
  getLogPrefix(level, source) {
    const emoji = {
      debug: '🐛',
      info: '📝',
      warn: '⚠️',
      error: '❌'
    };
    return `${emoji[level] || '📝'} [${source}]`;
  }

  /**
   * Serialize error object for storage
   */
  serializeError(error) {
    if (!error) return null;
    
    return {
      message: error.message || 'Unknown error',
      stack: error.stack || null,
      code: error.code || null,
      name: error.name || 'Error'
    };
  }

  /**
   * Check browser support
   */
  checkBrowserSupport() {
    return {
      hasConsole: typeof console !== 'undefined',
      hasLocalStorage: typeof localStorage !== 'undefined',
      consoleMethods: ['log', 'error', 'warn', 'info', 'debug'].reduce((acc, method) => {
        acc[method] = !!(console && typeof console[method] === 'function');
        return acc;
      }, {})
    };
  }
}

// Create singleton instance
const appLogger = new AppLogger();

// Export for window access (admin interface and debugging)
if (typeof window !== 'undefined') {
  window.AppLogger = appLogger;
  
  // Convenience methods for browser console
  window.enableLogging = () => appLogger.enable();
  window.disableLogging = () => appLogger.disable();
  window.getLoggerState = () => appLogger.getState();
  window.getAppErrors = () => appLogger.getErrors();
  window.clearAppErrors = () => appLogger.clearErrors();
  window.exportDebugData = () => appLogger.exportErrors();
}

export default appLogger;