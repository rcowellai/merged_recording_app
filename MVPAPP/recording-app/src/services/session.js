import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase.js';

const validateSessionFunction = httpsCallable(functions, 'validateRecordingSession');

/**
 * Validate a recording session
 * @param {string} sessionId - The session ID to validate
 * @returns {Promise<Object>} Session validation result
 */
export const validateSession = async (sessionId) => {
  console.log('🔍 validateSession called with sessionId:', sessionId);
  
  try {
    // Add timeout directly to the Firebase function call
    const timeoutMs = 4000; // 4 seconds (must be shorter than test timeout)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firebase function timeout')), timeoutMs);
    });
    
    console.log('🚀 Calling Firebase function validateRecordingSession...');
    
    const result = await Promise.race([
      validateSessionFunction({ sessionId }),
      timeoutPromise
    ]);
    
    // Log the complete response structure to understand what we're getting
    console.log('📥 Complete Firebase function response:', JSON.stringify(result, null, 2));
    console.log('📥 Response data field:', result?.data);
    console.log('📥 Response data type:', typeof result?.data);
    
    // Handle both response formats:
    // Love Retold main app format: { data: { valid: true, session: {...} } }
    // Recording app format: { data: { isValid: true, status: 'pending', message: '...' } }
    if (result && result.data) {
      const data = result.data;
      console.log('✅ Processing valid response data:', data);
      
      let transformedResponse;
      
      // Check if this is the Love Retold main app response format
      if (data.valid !== undefined && data.session) {
        console.log('📱 Detected Love Retold main app response format');
        // Transform from main app format to recording app format
        transformedResponse = {
          status: data.session.status || 'pending',
          message: 'Session is valid and ready for recording',
          isValid: data.valid,
          sessionData: {
            questionText: data.session.promptText || data.session.questionText,
            createdAt: data.session.createdAt,
            expiresAt: data.session.expiresAt,
          },
          // Include the full session data
          session: data.session
        };
      } else {
        console.log('🔧 Detected Recording app response format');
        // This is our recording app format
        transformedResponse = {
          status: data.status || 'unknown',
          message: data.message || 'Unknown status',
          isValid: data.isValid || false,
          sessionData: data.sessionData || null,
          // Include any additional data from the original response
          ...data
        };
      }
      
      console.log('🔄 Transformed response:', transformedResponse);
      return transformedResponse;
    }
    
    // Fallback if no data
    console.warn('⚠️ No data field in response, using fallback');
    return {
      status: 'error',
      message: 'No data received from server'
    };
  } catch (error) {
    console.error('Error validating session:', error);
    
    // Handle timeout specifically
    if (error.message === 'Firebase function timeout') {
      return {
        status: 'error',
        message: 'Connection timeout. Please check your internet connection and try again.'
      };
    }
    
    // Handle network-related errors specifically
    if (error.code === 'functions/network-error' || 
        error.code === 'functions/internal' ||
        error.name === 'NetworkError' ||
        error.message?.includes('fetch') ||
        error.message?.includes('Failed to fetch')) {
      return {
        status: 'error',
        message: 'Connection problem. Please check your internet and try again.'
      };
    }
    
    // Handle different error types
    if (error.code === 'functions/not-found') {
      return {
        status: 'removed',
        message: 'This question has been removed by the account owner'
      };
    }
    
    // Handle expired sessions
    if (error.code === 'functions/failed-precondition' || 
        error.code === 'functions/permission-denied' ||
        error.message?.includes('expired') ||
        error.message?.includes('link expired')) {
      return {
        status: 'expired',
        message: 'This recording link has expired (links are valid for 7 days)'
      };
    }
    
    if (error.code === 'functions/unavailable') {
      return {
        status: 'error',
        message: 'Service temporarily unavailable. Please try again later.'
      };
    }
    
    // Default error handling - always return error status, never throw
    return {
      status: 'error',
      message: 'Unable to validate session. Please check your connection and try again.'
    };
  }
};

/**
 * Enhanced status mapping with defensive handling and rich status objects
 * @param {string} status - Session status (may be null, undefined, or unexpected)
 * @param {string} customMessage - Custom message from server
 * @returns {Object} Rich status object with message, canRecord, category, and normalized status
 */
export const getEnhancedSessionStatus = (status, customMessage = '') => {
  // Defensive normalization of status input
  const normalizedStatus = (() => {
    if (status === null || status === undefined) {
      console.warn('⚠️ Null/undefined status received, treating as unknown');
      return 'unknown';
    }
    if (typeof status !== 'string') {
      console.warn('⚠️ Non-string status received:', typeof status, status, 'treating as unknown');
      return 'unknown';
    }
    return status.toLowerCase().trim();
  })();
  
  // Comprehensive status definitions with rich metadata
  const statusDefinitions = {
    // Ready states - can record
    'active': {
      message: 'Ready to record your memory',
      canRecord: true,
      category: 'ready',
      status: 'active'
    },
    'pending': {
      message: 'Ready to record your memory',
      canRecord: true,
      category: 'ready', 
      status: 'pending'
    },
    
    // Completed states - cannot record
    'completed': {
      message: 'This memory has already been recorded',
      canRecord: false,
      category: 'completed',
      status: 'completed'
    },
    
    // Progress states - cannot record (recording in progress)
    'processing': {
      message: 'Your recording is being processed',
      canRecord: false,
      category: 'progress',
      status: 'processing'
    },
    'recording': {
      message: 'Recording is currently in progress',
      canRecord: false,
      category: 'progress',
      status: 'recording'
    },
    'uploading': {
      message: 'Your recording is being uploaded',
      canRecord: false,
      category: 'progress',
      status: 'uploading'
    },
    
    // Error states - cannot record
    'expired': {
      message: 'This recording link has expired (links are valid for 7 days)',
      canRecord: false,
      category: 'error',
      status: 'expired'
    },
    'removed': {
      message: 'This question has been removed by the account owner',
      canRecord: false,
      category: 'error',
      status: 'removed'
    },
    'failed': {
      message: 'Recording failed. Please try again.',
      canRecord: false,
      category: 'error',
      status: 'failed'
    },
    'invalid': {
      message: 'Invalid recording session. Please check your link.',
      canRecord: false,
      category: 'error',
      status: 'invalid'
    },
    'error': {
      message: customMessage || 'Unable to load recording session',
      canRecord: false,
      category: 'error',
      status: 'error'
    },
    
    // Unknown/fallback states
    'unknown': {
      message: 'Session status unknown. Please refresh and try again.',
      canRecord: false,
      category: 'unknown',
      status: 'unknown'
    }
  };
  
  const statusObj = statusDefinitions[normalizedStatus];
  
  if (statusObj) {
    return statusObj;
  }
  
  // Defensive fallback for truly unexpected statuses
  console.warn('⚠️ Unknown session status encountered:', status, '(normalized:', normalizedStatus, ') - logging for monitoring');
  
  // Log for production monitoring without exposing internals
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'unknown_session_status', {
      'custom_parameter': normalizedStatus,
      'event_category': 'session_validation'
    });
  }
  
  // Return safe fallback
  return {
    message: `Unexpected session state (${normalizedStatus}). Please refresh and try again.`,
    canRecord: false,
    category: 'unknown',
    status: 'unknown'
  };
};

/**
 * Legacy compatibility function - maintains backward compatibility
 * @param {string} status - Session status
 * @param {string} customMessage - Custom message from server
 * @returns {string} User-friendly message
 */
export const getSessionStatusMessage = (status, customMessage = '') => {
  const statusObj = getEnhancedSessionStatus(status, customMessage);
  return statusObj.message;
};

/**
 * Check if session allows recording - enhanced with defensive handling
 * @param {string} status - Session status (may be null, undefined, or unexpected)
 * @returns {boolean} Whether recording is allowed
 */
export const canRecord = (status) => {
  const statusObj = getEnhancedSessionStatus(status);
  return statusObj.canRecord;
};

/**
 * Get status category for UI styling and behavior
 * @param {string} status - Session status
 * @returns {string} Status category (ready, completed, progress, error, unknown)
 */
export const getStatusCategory = (status) => {
  const statusObj = getEnhancedSessionStatus(status);
  return statusObj.category;
};

/**
 * Check if status represents an error state
 * @param {string} status - Session status
 * @returns {boolean} Whether status is an error state
 */
export const isErrorStatus = (status) => {
  const category = getStatusCategory(status);
  return category === 'error' || category === 'unknown';
};

/**
 * Check if status represents a completed state
 * @param {string} status - Session status
 * @returns {boolean} Whether status is a completed state
 */
export const isCompletedStatus = (status) => {
  const category = getStatusCategory(status);
  return category === 'completed';
};

/**
 * Check if status represents a progress state
 * @param {string} status - Session status
 * @returns {boolean} Whether status is a progress state
 */
export const isProgressStatus = (status) => {
  const category = getStatusCategory(status);
  return category === 'progress';
};