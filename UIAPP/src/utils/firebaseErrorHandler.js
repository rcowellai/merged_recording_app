/**
 * 🛡️ Firebase Error Handler for UIAPP (C08)
 * ============================================
 * 
 * CONSOLIDATION OBJECTIVE:
 * Centralized Firebase error mapping, retry logic, and fallback mechanisms
 * following UIAPP patterns with automatic localStorage fallback on failures.
 * 
 * KEY FEATURES:
 * - Maps all Firebase error codes to UIAPP error types
 * - Exponential backoff retry for transient errors  
 * - Automatic classification of retryable vs non-retryable errors
 * - Production-safe logging with PII/secret redaction
 * - Feature flag integration for fallback control
 * 
 * INTEGRATION FOUNDATION:
 * - Uses existing UIAPP error system (utils/errors.js)
 * - Respects Firebase feature flags from configuration
 * - Integrates with localStorage services for fallback
 * - Maintains C01-C07 service compatibility
 */

import { createError, UPLOAD_ERRORS } from './errors.js';

/**
 * Firebase Error Codes with Retry Classifications
 */
export const FIREBASE_ERROR_TYPES = {
  // Authentication Errors
  'auth/network-request-failed': { type: UPLOAD_ERRORS.NETWORK_ERROR, retryable: true },
  'auth/timeout': { type: UPLOAD_ERRORS.TIMEOUT, retryable: true },
  'auth/too-many-requests': { type: UPLOAD_ERRORS.QUOTA_EXCEEDED, retryable: true },
  'auth/operation-not-allowed': { type: UPLOAD_ERRORS.PERMISSION_DENIED, retryable: false },
  'auth/user-disabled': { type: UPLOAD_ERRORS.PERMISSION_DENIED, retryable: false },
  'auth/invalid-api-key': { type: UPLOAD_ERRORS.PERMISSION_DENIED, retryable: false },
  
  // Storage Errors  
  'storage/quota-exceeded': { type: UPLOAD_ERRORS.QUOTA_EXCEEDED, retryable: false },
  'storage/unauthenticated': { type: UPLOAD_ERRORS.PERMISSION_DENIED, retryable: true },
  'storage/unauthorized': { type: UPLOAD_ERRORS.PERMISSION_DENIED, retryable: false },
  'storage/retry-limit-exceeded': { type: UPLOAD_ERRORS.NETWORK_ERROR, retryable: true },
  'storage/invalid-format': { type: UPLOAD_ERRORS.INVALID_FILE, retryable: false },
  'storage/invalid-checksum': { type: UPLOAD_ERRORS.INVALID_FILE, retryable: true },
  'storage/canceled': { type: UPLOAD_ERRORS.NETWORK_ERROR, retryable: false },
  'storage/unknown': { type: UPLOAD_ERRORS.UNKNOWN, retryable: true },
  'storage/object-not-found': { type: UPLOAD_ERRORS.INVALID_FILE, retryable: false },
  'storage/bucket-not-found': { type: UPLOAD_ERRORS.PERMISSION_DENIED, retryable: false },
  'storage/project-not-found': { type: UPLOAD_ERRORS.PERMISSION_DENIED, retryable: false },
  
  // Firestore Errors
  'firestore/permission-denied': { type: UPLOAD_ERRORS.PERMISSION_DENIED, retryable: false },
  'firestore/not-found': { type: UPLOAD_ERRORS.INVALID_FILE, retryable: false },
  'firestore/already-exists': { type: UPLOAD_ERRORS.INVALID_FILE, retryable: false },
  'firestore/resource-exhausted': { type: UPLOAD_ERRORS.QUOTA_EXCEEDED, retryable: true },
  'firestore/deadline-exceeded': { type: UPLOAD_ERRORS.TIMEOUT, retryable: true },
  'firestore/unavailable': { type: UPLOAD_ERRORS.NETWORK_ERROR, retryable: true },
  'firestore/unauthenticated': { type: UPLOAD_ERRORS.PERMISSION_DENIED, retryable: true },
  'firestore/internal': { type: UPLOAD_ERRORS.UNKNOWN, retryable: true },
  
  // Functions Errors
  'functions/cancelled': { type: UPLOAD_ERRORS.NETWORK_ERROR, retryable: false },
  'functions/deadline-exceeded': { type: UPLOAD_ERRORS.TIMEOUT, retryable: true },
  'functions/internal': { type: UPLOAD_ERRORS.UNKNOWN, retryable: true },
  'functions/invalid-argument': { type: UPLOAD_ERRORS.INVALID_FILE, retryable: false },
  'functions/not-found': { type: UPLOAD_ERRORS.INVALID_FILE, retryable: false },
  'functions/permission-denied': { type: UPLOAD_ERRORS.PERMISSION_DENIED, retryable: false },
  'functions/resource-exhausted': { type: UPLOAD_ERRORS.QUOTA_EXCEEDED, retryable: true },
  'functions/unauthenticated': { type: UPLOAD_ERRORS.PERMISSION_DENIED, retryable: true },
  'functions/unavailable': { type: UPLOAD_ERRORS.NETWORK_ERROR, retryable: true },
  'functions/unknown': { type: UPLOAD_ERRORS.UNKNOWN, retryable: true }
};

/**
 * User-friendly error messages for Firebase-specific scenarios
 */
export const FIREBASE_ERROR_MESSAGES = {
  'auth/network-request-failed': 'Network error during authentication. Please check your connection and try again.',
  'auth/too-many-requests': 'Too many authentication attempts. Please wait a moment and try again.',
  'auth/operation-not-allowed': 'Anonymous authentication is not enabled. Please contact support.',
  
  'storage/quota-exceeded': 'Storage quota exceeded. Please contact support to increase your storage limit.',
  'storage/unauthenticated': 'Authentication expired. Refreshing session...',
  'storage/unauthorized': 'You do not have permission to access this file.',
  'storage/object-not-found': 'Recording not found. It may have been deleted or moved.',
  'storage/invalid-format': 'Invalid file format. Please record in a supported format.',
  
  'firestore/permission-denied': 'You do not have permission to access this data.',
  'firestore/not-found': 'Requested data not found. It may have been deleted.',
  'firestore/resource-exhausted': 'Database quota exceeded. Please try again later.',
  'firestore/deadline-exceeded': 'Database operation timed out. Please try again.',
  'firestore/unavailable': 'Database temporarily unavailable. Please try again.',
  
  'functions/deadline-exceeded': 'Server operation timed out. Please try again.',
  'functions/not-found': 'Server function not available. Please contact support.',
  'functions/permission-denied': 'You do not have permission to perform this action.',
  'functions/resource-exhausted': 'Server quota exceeded. Please try again later.',
  'functions/unavailable': 'Server temporarily unavailable. Please try again.'
};

/**
 * Retry Configuration
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds  
  exponentialBase: 2,
  jitter: true
};

/**
 * Production-safe logging utility that redacts PII and secrets
 * @param {string} level - Log level (error, warn, info, debug)
 * @param {string} message - Log message
 * @param {any} data - Additional data to log
 * @param {Object} context - Additional context (service, operation, etc.)
 */
export const safeLog = (level, message, data = null, context = {}) => {
  // Only log in development or when explicitly enabled
  if (process.env.NODE_ENV === 'production' && !process.env.REACT_APP_DEBUG_LOGGING) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    context,
    ...(data && { data: sanitizeLogData(data) })
  };
  
  const logMethod = console[level] || console.log;
  logMethod(`[${level.toUpperCase()}] ${timestamp} - ${message}`, logEntry);
};

/**
 * Sanitize log data by removing PII and secrets
 * @param {any} data - Data to sanitize
 * @returns {any} Sanitized data
 */
function sanitizeLogData(data) {
  if (!data) return data;
  
  const sensitiveFields = [
    'password', 'token', 'apiKey', 'secret', 'key',
    'email', 'phone', 'ssn', 'creditCard',
    'authorization', 'cookie', 'session'
  ];
  
  if (typeof data === 'string') {
    // Redact common sensitive patterns
    return data
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_REDACTED]')
      .replace(/AIza[0-9A-Za-z_-]{35}/g, '[API_KEY_REDACTED]');
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeLogData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  return data;
}

/**
 * Map Firebase error to UIAPP error type with user-friendly message
 * @param {Error} error - Firebase error object
 * @param {string} context - Context where error occurred (service, operation)
 * @returns {Object} Mapped error object
 */
export function mapFirebaseError(error, context = 'firebase') {
  if (!error) return null;
  
  safeLog('debug', 'Mapping Firebase error', error, { context });
  
  // Handle Firebase-specific errors
  if (error.code && FIREBASE_ERROR_TYPES[error.code]) {
    const errorInfo = FIREBASE_ERROR_TYPES[error.code];
    const customMessage = FIREBASE_ERROR_MESSAGES[error.code];
    
    const mappedError = createError(
      errorInfo.type,
      customMessage,
      error
    );
    
    // Add retry information
    mappedError.retryable = errorInfo.retryable;
    mappedError.context = context;
    
    return mappedError;
  }
  
  // Handle network errors
  if (error.message?.includes('network') || error.code === 'ERR_NETWORK') {
    return createError(
      UPLOAD_ERRORS.NETWORK_ERROR,
      'Network connection failed. Please check your internet connection and try again.',
      error
    );
  }
  
  // Handle timeout errors
  if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
    return createError(
      UPLOAD_ERRORS.TIMEOUT,
      'Operation timed out. Please try again.',
      error
    );
  }
  
  // Handle quota errors
  if (error.message?.includes('quota') || error.name === 'QuotaExceededError') {
    return createError(
      UPLOAD_ERRORS.QUOTA_EXCEEDED,
      'Storage quota exceeded. Please contact support.',
      error
    );
  }
  
  // Default to unknown error
  return createError(
    UPLOAD_ERRORS.UNKNOWN,
    'An unexpected error occurred. Please try again.',
    error
  );
}

/**
 * Calculate delay for exponential backoff with jitter
 * @param {number} attempt - Current attempt number (0-based)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt) {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.exponentialBase, attempt),
    RETRY_CONFIG.maxDelay
  );
  
  // Add jitter to prevent thundering herd
  if (RETRY_CONFIG.jitter) {
    return delay + Math.random() * 1000;
  }
  
  return delay;
}

/**
 * Execute operation with retry logic and exponential backoff
 * @param {Function} operation - Async operation to execute
 * @param {Object} options - Retry options
 * @param {string} context - Context for logging
 * @returns {Promise} Operation result
 */
export async function withRetry(operation, options = {}, context = 'operation') {
  const config = { ...RETRY_CONFIG, ...options };
  let lastError = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      safeLog('debug', `Attempting operation (attempt ${attempt + 1}/${config.maxRetries + 1})`, null, { context });
      
      const result = await operation();
      
      if (attempt > 0) {
        safeLog('info', `Operation succeeded on retry attempt ${attempt + 1}`, null, { context });
      }
      
      return result;
    } catch (error) {
      lastError = mapFirebaseError(error, context);
      
      safeLog('warn', `Operation failed (attempt ${attempt + 1}/${config.maxRetries + 1})`, {
        error: error.message,
        code: error.code,
        retryable: lastError.retryable
      }, { context });
      
      // Don't retry if error is not retryable or we've exhausted retries
      if (!lastError.retryable || attempt >= config.maxRetries) {
        break;
      }
      
      // Calculate delay and wait before retry
      const delay = calculateBackoffDelay(attempt);
      safeLog('debug', `Waiting ${delay}ms before retry`, null, { context });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Log final failure
  safeLog('error', `Operation failed after ${config.maxRetries + 1} attempts`, {
    finalError: lastError
  }, { context });
  
  throw lastError;
}

/**
 * Check if Firebase is available and enabled via feature flags
 * @returns {boolean} True if Firebase should be used
 */
export function isFirebaseEnabled() {
  const useFirebase = process.env.REACT_APP_USE_FIREBASE === 'true';
  const hasConfig = !!(
    process.env.REACT_APP_FIREBASE_API_KEY &&
    process.env.REACT_APP_FIREBASE_PROJECT_ID
  );
  
  return useFirebase && hasConfig;
}

/**
 * Check if specific Firebase service is enabled
 * @param {string} service - Service name (auth, storage, firestore, functions)
 * @returns {boolean} True if service is enabled
 */
export function isFirebaseServiceEnabled(service) {
  if (!isFirebaseEnabled()) return false;
  
  const serviceFlags = {
    auth: 'REACT_APP_FIREBASE_AUTH_ENABLED',
    storage: 'REACT_APP_FIREBASE_STORAGE_ENABLED',
    firestore: 'REACT_APP_FIREBASE_STORAGE_ENABLED', // Uses same flag as storage
    functions: 'REACT_APP_SESSION_VALIDATION_ENABLED'
  };
  
  const flagName = serviceFlags[service];
  return flagName ? process.env[flagName] === 'true' : true;
}

/**
 * Execute Firebase operation with automatic fallback to localStorage
 * @param {Function} firebaseOperation - Firebase operation to execute
 * @param {Function} fallbackOperation - LocalStorage fallback operation
 * @param {Object} options - Options for retry and fallback
 * @param {string} context - Context for logging
 * @returns {Promise} Operation result
 */
export async function withFirebaseFallback(
  firebaseOperation,
  fallbackOperation,
  options = {},
  context = 'firebase-operation'
) {
  // Check if Firebase is enabled
  if (!isFirebaseEnabled()) {
    safeLog('info', 'Firebase disabled, using localStorage fallback', null, { context });
    return await fallbackOperation();
  }
  
  try {
    // Attempt Firebase operation with retry
    const result = await withRetry(firebaseOperation, options, `${context}-firebase`);
    return result;
  } catch (firebaseError) {
    safeLog('warn', 'Firebase operation failed, falling back to localStorage', {
      error: firebaseError.message,
      type: firebaseError.type
    }, { context });
    
    // Attempt fallback operation
    try {
      const fallbackResult = await fallbackOperation();
      
      safeLog('info', 'Fallback operation succeeded', null, { context: `${context}-fallback` });
      return fallbackResult;
    } catch (fallbackError) {
      safeLog('error', 'Both Firebase and fallback operations failed', {
        firebaseError: firebaseError.message,
        fallbackError: fallbackError.message
      }, { context });
      
      // Return the original Firebase error as it's likely more informative
      throw firebaseError;
    }
  }
}

// Export default error handler
export const firebaseErrorHandler = {
  mapError: mapFirebaseError,
  withRetry,
  withFallback: withFirebaseFallback,
  isEnabled: isFirebaseEnabled,
  isServiceEnabled: isFirebaseServiceEnabled,
  log: safeLog
};