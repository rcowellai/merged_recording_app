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
    this.validateSessionFunction = httpsCallable(functions, 'getRecordingSession');
    this.defaultTimeout = 8000; // 8 seconds - handles cold starts
    this.lastError = null;
  }

  /**
   * Validate a recording session
   * Maintains exact same interface as MVPAPP session.js
   *
   * @param {string} sessionId - The session ID to validate
   * @param {number} timeoutMs - Timeout in milliseconds (default: 8000)
   * @returns {Promise<Object>} Session validation result
   */
  async validateSession(sessionId, timeoutMs = this.defaultTimeout) {
    console.log('🔍 validateSession called with sessionId:', sessionId);

    // IMPORTANT: Declare startTime BEFORE try block so it's accessible in catch
    const startTime = performance.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firebase function timeout')), timeoutMs);
      });

      console.log('🚀 Calling Firebase function getRecordingSession...');

      const result = await Promise.race([
        this.validateSessionFunction({ sessionId }),
        timeoutPromise
      ]);

      const elapsed = performance.now() - startTime;
      console.log(`⏱️ Cloud Function validation took ${elapsed}ms`);
      if (elapsed > 6000) {
        console.warn('⚠️ Validation slow (>6s)');
      }

      // Log the complete response structure
      console.log('📥 Complete Firebase function response:', JSON.stringify(result, null, 2));
      console.log('📥 Response data field:', result?.data);
      console.log('📥 Response data type:', typeof result?.data);
      
      // Handle Love Retold getRecordingSession response format
      if (result && result.data) {
        const data = result.data;
        console.log('✅ Processing Love Retold getRecordingSession response:', data);
        
        // Map Love Retold response to expected format
        this.lastError = null;
        return {
          status: data.status || 'unknown',
          message: data.message || 'Session validation failed',
          isValid: data.status === 'valid',
          sessionData: data.session ? {
            questionText: data.session.promptText || data.session.questionText,
            storytellerName: data.session.storytellerName,
            askerName: data.session.askerName,
            createdAt: data.session.createdAt,
            expiresAt: data.session.expiresAt,
          } : null,
          session: data.session || null
        };
      }
      
      // Fallback if no data
      console.warn('⚠️ No data field in response, using fallback');
      return {
        status: 'error',
        message: 'No data received from server'
      };
    } catch (error) {
      const elapsed = performance.now() - startTime;
      console.error(`❌ Cloud Function validation failed after ${elapsed}ms:`, error);
      this.lastError = this.mapFunctionError(error);
      
      // Handle timeout specifically - client-side error
      if (error.message === 'Firebase function timeout') {
        return {
          status: 'error',
          message: 'Connection timeout. Please check your internet connection and try again.'
        };
      }
      
      // Handle network-related errors specifically - client-side errors
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
      
      if (error.code === 'functions/unavailable') {
        return {
          status: 'error',
          message: 'Service temporarily unavailable. Please try again later.'
        };
      }
      
      // Default error handling for genuine client-side errors - always return error status, never throw
      return {
        status: 'error',
        message: 'Unable to validate session. Please check your connection and try again.'
      };
    }
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

// Export methods with preserved context (fixes "this" binding issue)
export const validateSession = (...args) => firebaseFunctionsService.validateSession(...args);
export const getLastError = (...args) => firebaseFunctionsService.getLastError(...args);
export const clearError = (...args) => firebaseFunctionsService.clearError(...args);

// Service initialization logging
if (typeof window !== 'undefined' && window.AppLogger) {
  window.AppLogger.service('FirebaseFunctions', '🔧 Firebase Functions Service: LOADED');
}