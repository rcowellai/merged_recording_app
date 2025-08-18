/**
 * utils/errors.js
 * ---------------
 * Structured error handling utilities for the Recording App.
 * Provides consistent error types and safe parsing functions.
 */

// Error type constants for upload operations
export const UPLOAD_ERRORS = {
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_FILE: 'INVALID_FILE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN'
};

// Error messages mapped to error types
export const ERROR_MESSAGES = {
  [UPLOAD_ERRORS.QUOTA_EXCEEDED]: 'Storage quota exceeded. Please free up space and try again.',
  [UPLOAD_ERRORS.NETWORK_ERROR]: 'Network connection failed. Please check your connection.',
  [UPLOAD_ERRORS.INVALID_FILE]: 'Invalid file format or corrupted file.',
  [UPLOAD_ERRORS.PERMISSION_DENIED]: 'Permission denied. Please check your permissions.',
  [UPLOAD_ERRORS.TIMEOUT]: 'Operation timed out. Please try again.',
  [UPLOAD_ERRORS.UNKNOWN]: 'An unexpected error occurred. Please try again.'
};

// Storage error constants
export const STORAGE_ERRORS = {
  PARSE_ERROR: 'PARSE_ERROR',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  NOT_SUPPORTED: 'NOT_SUPPORTED'
};

/**
 * Safe JSON parsing with fallback and validation
 * @param {string} str - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback value
 */
export const safeParseJSON = (str, fallback = null) => {
  try {
    if (typeof str !== 'string' || str.trim() === '') {
      return fallback;
    }
    
    const parsed = JSON.parse(str);
    
    // Basic validation for expected data structure
    if (parsed === null || parsed === undefined) {
      return fallback;
    }
    
    return parsed;
  } catch (error) {
    console.warn('JSON parsing failed:', error.message);
    return fallback;
  }
};

/**
 * Validate storage data structure
 * @param {*} data - Data to validate
 * @returns {boolean} True if valid storage data
 */
export const validateStorageData = (data) => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // For arrays (recordings list)
  if (Array.isArray(data)) {
    return data.every(item => 
      item && 
      typeof item === 'object' && 
      typeof item.id === 'string'
    );
  }
  
  // For objects (blob storage)
  if (typeof data === 'object') {
    return Object.keys(data).every(key => 
      typeof key === 'string' && 
      typeof data[key] === 'string'
    );
  }
  
  return false;
};

/**
 * Create a structured error object
 * @param {string} type - Error type from UPLOAD_ERRORS
 * @param {string} message - Custom error message (optional)
 * @param {Error} originalError - Original error object (optional)
 * @returns {Object} Structured error object
 */
export const createError = (type, message = null, originalError = null) => {
  return {
    type,
    message: message || ERROR_MESSAGES[type] || ERROR_MESSAGES[UPLOAD_ERRORS.UNKNOWN],
    timestamp: new Date().toISOString(),
    originalError: originalError ? {
      name: originalError.name,
      message: originalError.message,
      stack: originalError.stack
    } : null
  };
};

/**
 * Classify browser storage errors
 * @param {Error} error - Browser error object
 * @returns {string} Error type from STORAGE_ERRORS
 */
export const classifyStorageError = (error) => {
  if (error.name === 'QuotaExceededError') {
    return STORAGE_ERRORS.QUOTA_EXCEEDED;
  }
  
  if (error.name === 'SyntaxError') {
    return STORAGE_ERRORS.PARSE_ERROR;
  }
  
  if (error.message?.includes('not supported')) {
    return STORAGE_ERRORS.NOT_SUPPORTED;
  }
  
  return STORAGE_ERRORS.PARSE_ERROR;
};