/**
 * 🔍 Production-Safe Logger
 * ==========================
 *
 * Intelligent logging system that adapts to environment and debug mode.
 * Preserves console.error/warn for production debugging while hiding
 * verbose console.log statements.
 *
 * FEATURES:
 * - Environment-aware (development vs production)
 * - Debug mode toggle support (see debugMode.js)
 * - Automatic Sentry integration for errors
 * - No performance impact when disabled
 * - Preserves stack traces for debugging
 *
 * USAGE:
 * import { logger } from '@/utils/logger';
 *
 * logger.debug('Component mounted', { props });
 * logger.info('Recording started');
 * logger.warn('Slow network detected');
 * logger.error('Upload failed', error);
 */

import { shouldLog } from './debugMode';

/**
 * Send error to Sentry (if available)
 * @param {Error|string} error - Error object or message
 * @param {object} context - Additional context
 */
function sendToSentry(error, context = {}) {
  if (typeof window !== 'undefined' && window.Sentry) {
    if (error instanceof Error) {
      window.Sentry.captureException(error, {
        contexts: {
          custom: context
        }
      });
    } else {
      window.Sentry.captureMessage(error, {
        level: 'error',
        contexts: {
          custom: context
        }
      });
    }
  }
}

/**
 * Format log arguments for consistent output
 * @param {string} level - Log level
 * @param  {...any} args - Log arguments
 * @returns {Array} Formatted arguments
 */
function formatArgs(level, ...args) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return [prefix, ...args];
}

/**
 * Production-safe logger object
 */
export const logger = {
  /**
   * Debug-level logging (hidden in production unless debug mode enabled)
   * @param  {...any} args - Arguments to log
   */
  debug(...args) {
    if (shouldLog('debug')) {
      console.log(...formatArgs('debug', ...args));
    }
  },

  /**
   * Verbose debug logging (only in development or verbose debug mode)
   * Use for very detailed logging like render cycles
   * @param  {...any} args - Arguments to log
   */
  verbose(...args) {
    if (shouldLog('verbose')) {
      console.log(...formatArgs('verbose', ...args));
    }
  },

  /**
   * Informational logging (hidden in production unless debug mode enabled)
   * @param  {...any} args - Arguments to log
   */
  info(...args) {
    if (shouldLog('info')) {
      console.info(...formatArgs('info', ...args));
    }
  },

  /**
   * Warning logging (always shown, even in production)
   * @param  {...any} args - Arguments to log
   */
  warn(...args) {
    console.warn(...formatArgs('warn', ...args));
  },

  /**
   * Error logging (always shown, sent to Sentry if available)
   * @param {string} message - Error message
   * @param {Error|object} errorOrContext - Error object or context
   * @param {object} additionalContext - Additional context (if error provided)
   */
  error(message, errorOrContext, additionalContext = {}) {
    const isError = errorOrContext instanceof Error;
    const error = isError ? errorOrContext : new Error(message);
    const context = isError ? additionalContext : errorOrContext;

    // Always log to console
    console.error(...formatArgs('error', message), error, context);

    // Send to Sentry
    sendToSentry(error, {
      message,
      ...context
    });
  },

  /**
   * Performance measurement logging
   * @param {string} label - Performance label
   * @param {number} duration - Duration in milliseconds
   * @param {object} context - Additional context
   */
  performance(label, duration, context = {}) {
    if (shouldLog('debug')) {
      const formatted = duration.toFixed(2);
      console.log(
        ...formatArgs('perf', `⚡ ${label}: ${formatted}ms`),
        context
      );
    }
  },

  /**
   * Create a namespaced logger for specific modules
   * @param {string} namespace - Module namespace
   * @returns {object} Namespaced logger
   */
  namespace(namespace) {
    return {
      debug: (...args) => logger.debug(`[${namespace}]`, ...args),
      verbose: (...args) => logger.verbose(`[${namespace}]`, ...args),
      info: (...args) => logger.info(`[${namespace}]`, ...args),
      warn: (...args) => logger.warn(`[${namespace}]`, ...args),
      error: (message, ...rest) => logger.error(`[${namespace}] ${message}`, ...rest),
      performance: (label, duration, context) =>
        logger.performance(`${namespace}.${label}`, duration, context)
    };
  },

  /**
   * Group related logs together (collapsed in production)
   * @param {string} label - Group label
   * @param {Function} callback - Callback to execute within group
   */
  group(label, callback) {
    if (shouldLog('debug')) {
      console.group(label);
      try {
        callback();
      } finally {
        console.groupEnd();
      }
    } else {
      // Execute callback without grouping in production
      callback();
    }
  }
};

/**
 * Create performance measurement helper
 * @param {string} label - Performance label
 * @returns {Function} End measurement function
 *
 * @example
 * const end = logger.measure('Upload recording');
 * await uploadRecording();
 * end(); // Logs: "⚡ Upload recording: 1234.56ms"
 */
export function measure(label) {
  const start = performance.now();

  return (context = {}) => {
    const duration = performance.now() - start;
    logger.performance(label, duration, context);
    return duration;
  };
}

/**
 * Async wrapper for performance measurement
 * @param {string} label - Performance label
 * @param {Function} asyncFn - Async function to measure
 * @returns {Promise} Result of async function
 *
 * @example
 * const result = await logger.measureAsync('Fetch data', async () => {
 *   return await fetchData();
 * });
 */
export async function measureAsync(label, asyncFn) {
  const end = measure(label);
  try {
    const result = await asyncFn();
    end({ success: true });
    return result;
  } catch (error) {
    end({ success: false, error: error.message });
    throw error;
  }
}

// Default export
export default logger;
