/**
 * 🔧 Debug Mode Utility
 * =====================
 *
 * Production-safe debug mode toggle that enables verbose logging
 * without requiring code changes or redeployment.
 *
 * USAGE IN PRODUCTION:
 * - Open browser console
 * - Run: window.__enableDebug()
 * - Reload page to see verbose logs
 * - Disable: window.__disableDebug()
 *
 * FEATURES:
 * - Persists across page reloads
 * - Session-specific (localStorage)
 * - No performance impact when disabled
 * - Easy to enable for debugging production issues
 */

const DEBUG_KEY = 'LOVE_RETOLD_DEBUG_MODE';
const DEBUG_VERBOSE_KEY = 'LOVE_RETOLD_DEBUG_VERBOSE';

/**
 * Check if debug mode is currently enabled
 * @returns {boolean}
 */
export function isDebugEnabled() {
  return localStorage.getItem(DEBUG_KEY) === 'true';
}

/**
 * Check if verbose debug mode is enabled
 * @returns {boolean}
 */
export function isVerboseDebugEnabled() {
  return localStorage.getItem(DEBUG_VERBOSE_KEY) === 'true';
}

/**
 * Enable debug mode for this session
 * @param {boolean} verbose - Enable verbose logging (includes all component renders)
 */
export function enableDebugMode(verbose = false) {
  localStorage.setItem(DEBUG_KEY, 'true');

  if (verbose) {
    localStorage.setItem(DEBUG_VERBOSE_KEY, 'true');
    console.log('🔧 Debug mode enabled (VERBOSE) - reload page to see all logs');
  } else {
    console.log('🔧 Debug mode enabled - reload page to see debug logs');
  }

  console.log('💡 Tip: Run window.__disableDebug() to turn off debug mode');
}

/**
 * Disable debug mode
 */
export function disableDebugMode() {
  localStorage.removeItem(DEBUG_KEY);
  localStorage.removeItem(DEBUG_VERBOSE_KEY);
  console.log('✅ Debug mode disabled - reload page to hide debug logs');
}

/**
 * Get current debug configuration
 * @returns {object} Debug configuration status
 */
export function getDebugConfig() {
  return {
    enabled: isDebugEnabled(),
    verbose: isVerboseDebugEnabled(),
    environment: process.env.NODE_ENV,
    isDevelopment: process.env.NODE_ENV === 'development'
  };
}

/**
 * Check if logs should be shown for current context
 * @param {string} level - Log level: 'debug', 'info', 'verbose'
 * @returns {boolean}
 */
export function shouldLog(level = 'debug') {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const debugEnabled = isDebugEnabled();
  const verboseEnabled = isVerboseDebugEnabled();

  switch (level) {
    case 'verbose':
      return isDevelopment || verboseEnabled;
    case 'debug':
    case 'info':
      return isDevelopment || debugEnabled;
    case 'warn':
    case 'error':
      return true; // Always show warnings and errors
    default:
      return isDevelopment || debugEnabled;
  }
}

/**
 * Display current debug status in console
 */
export function showDebugStatus() {
  const config = getDebugConfig();
  console.log('🔍 Debug Mode Status:');
  console.table(config);

  if (config.enabled) {
    console.log('✅ Debug mode is ON');
    console.log('💡 Run window.__disableDebug() to turn off');
  } else {
    console.log('❌ Debug mode is OFF');
    console.log('💡 Run window.__enableDebug() to turn on');
    console.log('💡 Run window.__enableDebug(true) for verbose mode');
  }
}

// Expose debug functions globally for easy access in production
if (typeof window !== 'undefined') {
  window.__enableDebug = enableDebugMode;
  window.__disableDebug = disableDebugMode;
  window.__debugStatus = showDebugStatus;

  // Show helper on load if debug is enabled
  if (isDebugEnabled()) {
    console.log('🔧 Debug mode is active');
    console.log('💡 Run window.__debugStatus() for details');
  }
}
