/**
 * 🔥 Firebase Functions Service for UIAPP (C02)
 * ==============================================
 * 
 * DEVELOPER HANDOFF NOTES:
 * - Rewritten from MVPAPP session validation logic using UIAPP patterns
 * - Maintains same validateSession functionality with UIAPP error handling
 * - Integrates with UIAPP's structured error system in utils/errors.js
 * - Follows UIAPP service conventions and timeout handling
 * - Uses same interface as MVPAPP but with UIAPP config patterns
 * 
 * MVPAPP SOURCE: recording-app/src/services/session.js
 * UIAPP TARGET: src/services/firebase/functions.js
 * CONVENTIONS: UIAPP error handling, config patterns, service interfaces
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { 
  createError, 
  UPLOAD_ERRORS 
} from '../../utils/errors';

/**
 * Firebase Functions Service
 * Provides session validation and other Firebase Functions calls
 */
class FirebaseFunctionsService {
  constructor() {
    this.validateSessionFunction = httpsCallable(functions, 'validateRecordingSession');
    this.defaultTimeout = 4000; // 4 seconds (same as MVPAPP)
    this.lastError = null;
  }

  /**
   * Validate a recording session
   * Maintains exact same interface as MVPAPP session.js
   * 
   * @param {string} sessionId - The session ID to validate
   * @param {number} timeoutMs - Timeout in milliseconds (default: 4000)
   * @returns {Promise<Object>} Session validation result
   */
  async validateSession(sessionId, timeoutMs = this.defaultTimeout) {
    console.log('🔍 validateSession called with sessionId:', sessionId);
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firebase function timeout')), timeoutMs);
      });
      
      console.log('🚀 Calling Firebase function validateRecordingSession...');
      
      const result = await Promise.race([
        this.validateSessionFunction({ sessionId }),
        timeoutPromise
      ]);
      
      // Log the complete response structure
      console.log('📥 Complete Firebase function response:', JSON.stringify(result, null, 2));
      console.log('📥 Response data field:', result?.data);
      console.log('📥 Response data type:', typeof result?.data);
      
      // Handle both response formats from MVPAPP
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
        this.lastError = null;
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
      this.lastError = this.mapFunctionError(error);
      
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
  }

  /**
   * Enhanced status mapping with defensive handling and rich status objects
   * Maintains exact same interface as MVPAPP getEnhancedSessionStatus
   * 
   * @param {string} status - Session status (may be null, undefined, or unexpected)
   * @param {string} customMessage - Custom message from server
   * @returns {Object} Rich status object with message, canRecord, category, and normalized status
   */
  getEnhancedSessionStatus(status, customMessage = '') {
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
    
    // Comprehensive status definitions with rich metadata (from MVPAPP)
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
    
    // Return safe fallback
    return {
      message: `Unexpected session state (${normalizedStatus}). Please refresh and try again.`,
      canRecord: false,
      category: 'unknown',
      status: 'unknown'
    };
  }

  /**
   * Legacy compatibility function - maintains backward compatibility
   * @param {string} status - Session status
   * @param {string} customMessage - Custom message from server
   * @returns {string} User-friendly message
   */
  getSessionStatusMessage(status, customMessage = '') {
    const statusObj = this.getEnhancedSessionStatus(status, customMessage);
    return statusObj.message;
  }

  /**
   * Check if session allows recording
   * @param {string} status - Session status
   * @returns {boolean} Whether recording is allowed
   */
  canRecord(status) {
    const statusObj = this.getEnhancedSessionStatus(status);
    return statusObj.canRecord;
  }

  /**
   * Get status category for UI styling and behavior
   * @param {string} status - Session status
   * @returns {string} Status category (ready, completed, progress, error, unknown)
   */
  getStatusCategory(status) {
    const statusObj = this.getEnhancedSessionStatus(status);
    return statusObj.category;
  }

  /**
   * Check if status represents an error state
   * @param {string} status - Session status
   * @returns {boolean} Whether status is an error state
   */
  isErrorStatus(status) {
    const category = this.getStatusCategory(status);
    return category === 'error' || category === 'unknown';
  }

  /**
   * Check if status represents a completed state
   * @param {string} status - Session status
   * @returns {boolean} Whether status is a completed state
   */
  isCompletedStatus(status) {
    const category = this.getStatusCategory(status);
    return category === 'completed';
  }

  /**
   * Check if status represents a progress state
   * @param {string} status - Session status
   * @returns {boolean} Whether status is a progress state
   */
  isProgressStatus(status) {
    const category = this.getStatusCategory(status);
    return category === 'progress';
  }

  /**
   * Get last function call error
   * @returns {Error|null} Last error or null
   */
  getLastError() {
    return this.lastError;
  }

  /**
   * Clear last error
   */
  clearError() {
    this.lastError = null;
  }

  /**
   * Map Firebase function errors to UIAPP error patterns
   * @param {Error} error - Firebase function error
   * @returns {Error} Mapped UIAPP error
   */
  mapFunctionError(error) {
    if (!error) return null;

    // Handle Firebase function errors
    if (error.code && error.code.startsWith('functions/')) {
      switch (error.code) {
        case 'functions/network-error':
          return createError(
            UPLOAD_ERRORS.NETWORK_ERROR,
            'Network connection failed. Please check your internet connection.',
            error
          );
        case 'functions/timeout':
          return createError(
            UPLOAD_ERRORS.TIMEOUT,
            'Function call timeout. Please try again.',
            error
          );
        case 'functions/not-found':
          return createError(
            UPLOAD_ERRORS.NOT_FOUND,
            'Requested function not found.',
            error
          );
        case 'functions/permission-denied':
          return createError(
            UPLOAD_ERRORS.PERMISSION_DENIED,
            'Permission denied. Please check your authentication.',
            error
          );
        default:
          return createError(
            UPLOAD_ERRORS.UNKNOWN,
            `Function call failed: ${error.message}`,
            error
          );
      }
    }

    // Handle timeout errors
    if (error.message && error.message.includes('timeout')) {
      return createError(
        UPLOAD_ERRORS.TIMEOUT,
        'Function call timeout. Please check your connection and try again.',
        error
      );
    }

    // Handle generic errors
    return createError(
      UPLOAD_ERRORS.UNKNOWN,
      error.message || 'An unknown function call error occurred.',
      error
    );
  }
}

// Create singleton instance following UIAPP patterns
const firebaseFunctionsService = new FirebaseFunctionsService();

// Export service instance and individual functions for flexibility
export default firebaseFunctionsService;

export const {
  validateSession,
  getEnhancedSessionStatus,
  getSessionStatusMessage,
  canRecord,
  getStatusCategory,
  isErrorStatus,
  isCompletedStatus,
  isProgressStatus,
  getLastError,
  clearError
} = firebaseFunctionsService;

console.log('🔧 Firebase Functions Service: LOADED');