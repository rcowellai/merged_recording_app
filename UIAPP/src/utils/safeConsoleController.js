/**
 * Safe Console Controller for Love Retold Recording App
 * ====================================================
 * Enhanced console debugging control with deferred initialization and robust error handling
 * 
 * Features:
 * - Deferred initialization to avoid timing conflicts with app startup
 * - Comprehensive error handling for localStorage and browser compatibility
 * - Safe console method preservation and restoration
 * - Integration with existing debugLogger system
 * - Fail-safe mechanisms for all critical operations
 */

class SafeConsoleController {
  constructor() {
    // Configuration
    this.STORAGE_KEY = 'admin-console-debug-enabled';
    this.DEBUG_PREFIX = '🔧 SafeConsoleController:';
    
    // State management
    this.isEnabled = null; // null = not initialized, true/false = state
    this.isInitialized = false;
    this.originalConsole = {};
    this.suppressedMethods = {};
    
    // Error tracking
    this.initializationError = null;
    this.lastError = null;
    
    // Initialize safely without enforcement
    this.safeInitialize();
  }

  /**
   * Safe initialization - loads state but doesn't enforce console control
   * This prevents timing conflicts with app startup logging
   */
  safeInitialize() {
    try {
      // Load saved state with robust error handling
      this.isEnabled = this.loadStateWithFallback();
      
      // Preserve original console methods safely
      this.preserveOriginalConsole();
      
      // Create suppressed method implementations
      this.createSuppressedMethods();
      
      this.logSafe('info', 'Initialized safely', {
        enabled: this.isEnabled,
        hasOriginalConsole: Object.keys(this.originalConsole).length > 0
      });
      
    } catch (error) {
      this.initializationError = error;
      this.isEnabled = true; // Fail-safe: default to enabled
      this.logSafe('error', 'Initialization failed, defaulting to enabled', error);
    }
  }

  /**
   * Deferred initialization - called after app startup is complete
   * This is when we actually enforce the console control state
   */
  deferredInit() {
    if (this.isInitialized) {
      this.logSafe('warn', 'Already initialized, skipping deferred init');
      return;
    }

    try {
      // Apply the loaded state now that app startup is complete
      if (this.isEnabled === false) {
        this.suppressConsoleNow();
      } else {
        this.ensureConsoleEnabled();
      }
      
      // Integrate with debugLogger safely
      this.integrateWithDebugLogger();
      
      this.isInitialized = true;
      this.logSafe('info', 'Deferred initialization complete', {
        finalState: this.isEnabled ? 'enabled' : 'disabled'
      });
      
    } catch (error) {
      this.lastError = error;
      this.logSafe('error', 'Deferred initialization failed', error);
      // Fail-safe: ensure console is available
      this.forceRestoreConsole();
    }
  }

  /**
   * Enable console debugging - restores all original console methods
   */
  enable() {
    try {
      this.isEnabled = true;
      this.saveStateWithFallback(true);
      this.restoreOriginalConsole();
      this.enableDebugLogger();
      
      this.logSafe('info', 'Console debugging enabled');
      return { success: true };
      
    } catch (error) {
      this.lastError = error;
      this.logSafe('error', 'Failed to enable console debugging', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disable console debugging - suppresses all console output
   */
  disable() {
    try {
      this.isEnabled = false;
      this.saveStateWithFallback(false);
      this.suppressConsoleNow();
      this.disableDebugLogger();
      
      this.logSafe('info', 'Console debugging disabled');
      return { success: true };
      
    } catch (error) {
      this.lastError = error;
      this.logSafe('error', 'Failed to disable console debugging', error);
      // Fail-safe: restore console on error
      this.forceRestoreConsole();
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current state and diagnostic information
   */
  getState() {
    return {
      isEnabled: this.isEnabled,
      isInitialized: this.isInitialized,
      hasOriginalConsole: Object.keys(this.originalConsole).length > 0,
      initializationError: this.initializationError?.message || null,
      lastError: this.lastError?.message || null,
      browserSupport: this.getBrowserSupport()
    };
  }

  /**
   * Force restore console - emergency recovery method
   */
  forceRestoreConsole() {
    try {
      Object.keys(this.originalConsole).forEach(method => {
        if (this.originalConsole[method] && typeof this.originalConsole[method] === 'function') {
          console[method] = this.originalConsole[method];
        }
      });
      this.logSafe('info', 'Console forcefully restored');
    } catch (error) {
      // Last resort: try to restore basic console.log
      if (this.originalConsole.log) {
        console.log = this.originalConsole.log;
      }
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Load state from localStorage with comprehensive error handling
   */
  loadStateWithFallback() {
    try {
      // Check if localStorage is available
      if (typeof Storage === 'undefined' || !window.localStorage) {
        this.logSafe('warn', 'localStorage not available, defaulting to enabled');
        return true;
      }

      const stored = localStorage.getItem(this.STORAGE_KEY);
      
      if (stored === null) {
        // No stored state, default to enabled
        return true;
      }

      // Parse with error handling
      const parsed = JSON.parse(stored);
      
      // Validate the parsed value
      if (typeof parsed === 'boolean') {
        return parsed;
      } else {
        this.logSafe('warn', 'Invalid stored state type, defaulting to enabled', { parsed });
        return true;
      }
      
    } catch (error) {
      this.logSafe('warn', 'Failed to load state from localStorage, defaulting to enabled', error);
      return true; // Fail-safe default
    }
  }

  /**
   * Save state to localStorage with error handling
   */
  saveStateWithFallback(state) {
    try {
      if (typeof Storage !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
        return true;
      }
    } catch (error) {
      this.logSafe('warn', 'Failed to save state to localStorage', error);
    }
    return false;
  }

  /**
   * Safely preserve original console methods with feature detection
   */
  preserveOriginalConsole() {
    const methods = ['log', 'error', 'warn', 'info', 'debug'];
    
    methods.forEach(method => {
      try {
        // Feature detection: check if method exists and is a function
        if (console && typeof console[method] === 'function') {
          // Properly bind the method to maintain correct 'this' context
          this.originalConsole[method] = console[method].bind(console);
        } else {
          this.logSafe('warn', `Console method ${method} not available`);
        }
      } catch (error) {
        this.logSafe('warn', `Failed to preserve console.${method}`, error);
      }
    });
  }

  /**
   * Create safe suppressed method implementations
   */
  createSuppressedMethods() {
    const methods = ['log', 'error', 'warn', 'info', 'debug'];
    
    methods.forEach(method => {
      // Create no-op functions that silently absorb all arguments
      this.suppressedMethods[method] = function() {
        // Intentionally empty - suppresses all console output
      };
    });
  }

  /**
   * Actually suppress console methods (called during deferred init or manual disable)
   */
  suppressConsoleNow() {
    Object.keys(this.suppressedMethods).forEach(method => {
      if (console && this.suppressedMethods[method]) {
        console[method] = this.suppressedMethods[method];
      }
    });
  }

  /**
   * Restore original console methods
   */
  restoreOriginalConsole() {
    Object.keys(this.originalConsole).forEach(method => {
      if (console && this.originalConsole[method]) {
        console[method] = this.originalConsole[method];
      }
    });
  }

  /**
   * Ensure console is enabled (used during deferred init when state is true)
   */
  ensureConsoleEnabled() {
    // Make sure original console methods are active
    this.restoreOriginalConsole();
  }

  /**
   * Safely integrate with debugLogger system
   */
  integrateWithDebugLogger() {
    try {
      if (typeof window !== 'undefined' && window.debugLogger) {
        if (this.isEnabled) {
          if (typeof window.debugLogger.enable === 'function') {
            window.debugLogger.enable();
          }
        } else {
          if (typeof window.debugLogger.disable === 'function') {
            window.debugLogger.disable();
          }
        }
      }
    } catch (error) {
      this.logSafe('warn', 'Failed to integrate with debugLogger', error);
    }
  }

  /**
   * Enable debugLogger if available
   */
  enableDebugLogger() {
    try {
      if (typeof window !== 'undefined' && 
          window.debugLogger && 
          typeof window.debugLogger.enable === 'function') {
        window.debugLogger.enable();
      }
    } catch (error) {
      this.logSafe('warn', 'Failed to enable debugLogger', error);
    }
  }

  /**
   * Disable debugLogger if available
   */
  disableDebugLogger() {
    try {
      if (typeof window !== 'undefined' && 
          window.debugLogger && 
          typeof window.debugLogger.disable === 'function') {
        window.debugLogger.disable();
      }
    } catch (error) {
      this.logSafe('warn', 'Failed to disable debugLogger', error);
    }
  }

  /**
   * Get browser console API support information
   */
  getBrowserSupport() {
    const methods = ['log', 'error', 'warn', 'info', 'debug'];
    const support = {};
    
    methods.forEach(method => {
      support[method] = !!(console && typeof console[method] === 'function');
    });
    
    return {
      hasConsole: typeof console !== 'undefined',
      hasLocalStorage: typeof Storage !== 'undefined' && !!window.localStorage,
      methods: support
    };
  }

  /**
   * Safe logging method that works even when console is suppressed
   * Uses original console methods directly to avoid recursion
   */
  logSafe(level, message, data = null) {
    try {
      // Only log if we have original console methods and are in development
      if (this.originalConsole[level] && 
          (typeof process === 'undefined' || 
           process.env?.NODE_ENV === 'development' || 
           process.env?.REACT_APP_DEBUG_LOGGING === 'true')) {
        
        const logData = {
          timestamp: new Date().toISOString(),
          level: level.toUpperCase(),
          message,
          ...(data && { data })
        };
        
        this.originalConsole[level](this.DEBUG_PREFIX, message, logData);
      }
    } catch (error) {
      // Fail silently to avoid infinite recursion
    }
  }
}

// Create singleton instance
const safeConsoleController = new SafeConsoleController();

// Expose to window for admin and debugging access
if (typeof window !== 'undefined') {
  window.safeConsoleController = safeConsoleController;
  
  // Convenient access methods
  window.enableConsoleDebug = () => safeConsoleController.enable();
  window.disableConsoleDebug = () => safeConsoleController.disable();
  window.getConsoleDebugState = () => safeConsoleController.getState();
}

export default safeConsoleController;