/**
 * Upload Error Tracker for Love Retold Integration
 * =================================================
 * Comprehensive error tracking system for diagnosing upload failures
 * Provides persistent storage for admin review and customer support
 * 
 * Business Purpose:
 * - Capture full context for upload failures to reduce support resolution time
 * - Track both truncated and full user IDs to diagnose path mismatches
 * - Monitor Love Retold status transitions for pipeline debugging
 * - Provide admin interface for reviewing errors without accessing production logs
 */

import { firebaseErrorHandler } from './firebaseErrorHandler';

const STORAGE_KEY = 'loveRetoldUploadErrors';
const MAX_ENTRIES = 50;

/**
 * Upload Error Tracker - Main tracking system
 */
export const uploadErrorTracker = {
  /**
   * Log an error with full context for diagnosis
   * @param {Error} error - The error object
   * @param {Object} context - Additional context for troubleshooting
   */
  logError(error, context = {}) {
    try {
      const errorRecord = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: 'error',
        message: error?.message || 'Unknown error',
        errorCode: error?.code,
        errorStack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
        
        // Session identification
        sessionId: context.sessionId,
        fullUserId: context.fullUserId,
        truncatedUserId: context.truncatedUserId,
        
        // Love Retold status tracking
        currentStatus: context.status,
        previousStatus: context.previousStatus,
        step: context.step,
        
        // Storage path diagnosis
        expectedStoragePath: context.expectedStoragePath,
        attemptedStoragePath: context.attemptedStoragePath,
        pathMismatch: context.expectedStoragePath !== context.attemptedStoragePath,
        
        // Upload metadata
        fileSize: context.fileSize,
        mimeType: context.mimeType,
        duration: context.duration,
        
        // Firestore update tracking
        firestoreUpdate: context.firestoreUpdate || {
          attempted: false,
          success: false,
          errorMessage: null
        },
        
        // Browser context for support
        browserUA: navigator.userAgent,
        browserPlatform: navigator.platform,
        browserOnline: navigator.onLine,
        
        // Additional context
        retryCount: context.retryCount || 0,
        uploadProgress: context.uploadProgress,
        additionalData: context.additionalData
      };
      
      // Log to console for development
      if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEBUG_LOGGING === 'true') {
        console.error('📊 Upload Error Tracked:', errorRecord);
      }
      
      // Also log through firebaseErrorHandler for consistency
      firebaseErrorHandler.log('error', 'Upload error tracked for admin review', {
        sessionId: context.sessionId,
        error: error?.message,
        step: context.step
      }, {
        service: 'upload-error-tracker',
        operation: 'log-error'
      });
      
      // Store in localStorage
      this._persistToStorage(errorRecord);
      
      return errorRecord;
    } catch (trackingError) {
      console.error('Failed to track error:', trackingError);
      return null;
    }
  },
  
  /**
   * Log informational message for successful operations or progress
   * @param {string} message - The message to log
   * @param {Object} context - Additional context
   */
  logInfo(message, context = {}) {
    try {
      const infoRecord = {
        id: `info_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: 'info',
        message,
        
        // Session identification
        sessionId: context.sessionId,
        fullUserId: context.fullUserId,
        truncatedUserId: context.truncatedUserId,
        
        // Love Retold status tracking
        currentStatus: context.status,
        step: context.step,
        
        // Storage paths for validation
        storagePath: context.storagePath,
        expectedStoragePath: context.expectedStoragePath,
        
        // Success tracking
        uploadProgress: context.uploadProgress,
        firestoreUpdateSuccess: context.firestoreUpdateSuccess,
        
        // Additional data
        additionalData: context.additionalData
      };
      
      // Log to console for development
      if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEBUG_LOGGING === 'true') {
        console.log('✅ Upload Info Tracked:', message, context);
      }
      
      // Store in localStorage for successful operations too (helps with diagnosis)
      this._persistToStorage(infoRecord);
      
      return infoRecord;
    } catch (trackingError) {
      console.error('Failed to track info:', trackingError);
      return null;
    }
  },
  
  /**
   * Log warning for non-critical issues
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  logWarning(message, context = {}) {
    try {
      const warningRecord = {
        id: `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: 'warning',
        message,
        sessionId: context.sessionId,
        fullUserId: context.fullUserId,
        truncatedUserId: context.truncatedUserId,
        details: context
      };
      
      if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEBUG_LOGGING === 'true') {
        console.warn('⚠️ Upload Warning:', message, context);
      }
      
      this._persistToStorage(warningRecord);
      return warningRecord;
    } catch (trackingError) {
      console.error('Failed to track warning:', trackingError);
      return null;
    }
  },
  
  /**
   * Persist record to localStorage with rolling buffer
   * @private
   */
  _persistToStorage(record) {
    try {
      // Get existing records
      const stored = this.getErrors();
      
      // Add new record
      stored.push(record);
      
      // Maintain rolling buffer (keep only last MAX_ENTRIES)
      if (stored.length > MAX_ENTRIES) {
        stored.splice(0, stored.length - MAX_ENTRIES);
      }
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      
      // Also maintain a summary for quick dashboard access
      this._updateSummary(stored);
    } catch (error) {
      console.error('Failed to persist to localStorage:', error);
    }
  },
  
  /**
   * Update summary statistics for dashboard
   * @private
   */
  _updateSummary(records) {
    try {
      const summary = {
        totalErrors: records.filter(r => r.type === 'error').length,
        totalWarnings: records.filter(r => r.type === 'warning').length,
        totalInfo: records.filter(r => r.type === 'info').length,
        lastError: records.filter(r => r.type === 'error').pop(),
        lastUpdate: new Date().toISOString(),
        pathMismatches: records.filter(r => r.pathMismatch === true).length,
        firestoreFailures: records.filter(r => r.firestoreUpdate?.attempted && !r.firestoreUpdate?.success).length
      };
      
      localStorage.setItem(`${STORAGE_KEY}_summary`, JSON.stringify(summary));
    } catch (error) {
      console.error('Failed to update summary:', error);
    }
  },
  
  /**
   * Retrieve all tracked errors from localStorage
   * @returns {Array} Array of error records
   */
  getErrors() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve errors from localStorage:', error);
      return [];
    }
  },
  
  /**
   * Get summary statistics
   * @returns {Object} Summary statistics
   */
  getSummary() {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_summary`);
      return stored ? JSON.parse(stored) : {
        totalErrors: 0,
        totalWarnings: 0,
        totalInfo: 0,
        lastError: null,
        lastUpdate: null,
        pathMismatches: 0,
        firestoreFailures: 0
      };
    } catch (error) {
      console.error('Failed to retrieve summary:', error);
      return {};
    }
  },
  
  /**
   * Clear all errors from localStorage (admin function)
   */
  clearErrors() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(`${STORAGE_KEY}_summary`);
      
      // Log the clear action
      firebaseErrorHandler.log('info', 'Admin cleared all upload errors', null, {
        service: 'upload-error-tracker',
        operation: 'clear-errors'
      });
      
      console.log('✅ All upload errors cleared by admin');
      return true;
    } catch (error) {
      console.error('Failed to clear errors:', error);
      return false;
    }
  },
  
  /**
   * Export errors as JSON for support tickets
   * @returns {string} JSON string of all errors
   */
  exportErrors() {
    try {
      const errors = this.getErrors();
      return JSON.stringify(errors, null, 2);
    } catch (error) {
      console.error('Failed to export errors:', error);
      return '[]';
    }
  },
  
  /**
   * Filter errors by criteria for diagnosis
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered error records
   */
  filterErrors(filters = {}) {
    try {
      let records = this.getErrors();
      
      if (filters.sessionId) {
        records = records.filter(r => r.sessionId === filters.sessionId);
      }
      
      if (filters.type) {
        records = records.filter(r => r.type === filters.type);
      }
      
      if (filters.userId) {
        records = records.filter(r => 
          r.fullUserId === filters.userId || 
          r.truncatedUserId === filters.userId
        );
      }
      
      if (filters.startDate) {
        const startTime = new Date(filters.startDate).getTime();
        records = records.filter(r => new Date(r.timestamp).getTime() >= startTime);
      }
      
      if (filters.endDate) {
        const endTime = new Date(filters.endDate).getTime();
        records = records.filter(r => new Date(r.timestamp).getTime() <= endTime);
      }
      
      if (filters.pathMismatch !== undefined) {
        records = records.filter(r => r.pathMismatch === filters.pathMismatch);
      }
      
      return records;
    } catch (error) {
      console.error('Failed to filter errors:', error);
      return [];
    }
  }
};

// Auto-initialize on import to start tracking immediately
if (typeof window !== 'undefined') {
  // Log initialization
  uploadErrorTracker.logInfo('Upload error tracking initialized', {
    maxEntries: MAX_ENTRIES,
    storageKey: STORAGE_KEY,
    environment: process.env.NODE_ENV
  });
}

export default uploadErrorTracker;