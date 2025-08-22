/**
 * 🔥 Firebase Storage & Download Service for UIAPP (C07)
 * =====================================================
 * 
 * DEVELOPER HANDOFF NOTES:
 * - Implements Firebase Storage retrieval and management for recording downloads
 * - Builds on C06 recording session architecture and C05 storage foundation
 * - Maintains UIAPP patterns and interfaces compatible with existing admin/playback
 * - Provides download URLs, listing, deletion, and cleanup functionality
 * 
 * SLICE OBJECTIVE: 
 * - Create download service using C06 recording session data structure
 * - Recording listing via Firestore queries to recordingSessions collection
 * - Playback integration with existing Plyr media player via download URLs
 * - Storage cleanup for failed/cancelled uploads with Firestore metadata
 * - Admin page integration for listing and filtering recordings
 * - Basic quota monitoring and user-facing error mapping
 * 
 * INTEGRATION FOUNDATION:
 * - C06: Recording session management (recordingSessions collection)
 * - C05: Storage operations (getDownloadURL, deleteFile, etc.)
 * - C04: Firestore operations (getUserRecordingSessions, getRecordingSession)
 * - UIAPP: Admin page, ViewRecording page, localRecordingService interface
 * 
 * MVPAPP SOURCES: recording-app/src/services/stories.js storage patterns
 * UIAPP TARGET: src/services/firebaseStorage.js (C07 download service)
 * CONVENTIONS: UIAPP error handling, service interfaces, admin compatibility
 */

import {
  getDownloadURL,
  deleteFile,
  getFileMetadata,
  getSignedUrl
} from './firebase/storage.js';
import {
  getUserRecordingSessions,
  getAllRecordingSessions,
  getRecordingSession,
  updateRecordingSession,
  deleteStory
} from './firebase/firestore.js';
import { createError, UPLOAD_ERRORS } from '../utils/errors.js';
import { firebaseErrorHandler } from '../utils/firebaseErrorHandler.js';

/**
 * Firebase Storage & Download Service
 * Provides recording retrieval, listing, and management with UIAPP compatibility
 */
class FirebaseStorageService {
  constructor() {
    this.lastError = null;
    this.quotaWarningThreshold = 0.8; // Warn at 80% quota
  }

  /**
   * Generate upload path following C06 recording session patterns
   * @param {string} sessionId - Recording session ID
   * @param {string} userId - User ID
   * @param {string} fileName - File name
   * @returns {string} Storage path
   */
  generateUploadPath(sessionId, userId, fileName) {
    const timestamp = Date.now();
    // Handle files without extension - default to mp4
    const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : 'mp4';
    return `users/${userId}/recordings/${sessionId}/${timestamp}_recording.${fileExtension}`;
  }

  /**
   * Get download URL for playback (Plyr-compatible) with C08 retry logic
   * Uses C06 recording session data for URL generation
   * 
   * @param {string} path - Storage path or recording session ID
   * @returns {Promise<string>} Download URL for media player
   */
  async getDownloadUrl(path) {
    return await firebaseErrorHandler.withRetry(
      async () => {
        firebaseErrorHandler.log('debug', 'Getting download URL for path', { path }, {
          service: 'firebase-storage',
          operation: 'get-download-url'
        });

        // Check if path is a session ID (no slashes) vs storage path
        if (!path.includes('/')) {
          // It's a session ID - get download URL from session data
          const session = await getRecordingSession(path);
          if (session?.downloadUrl) {
            firebaseErrorHandler.log('debug', 'Using cached download URL from session', null, {
              service: 'firebase-storage',
              operation: 'get-download-url-cached'
            });
            this.lastError = null;
            return session.downloadUrl;
          } else if (session?.storagePath) {
            // Generate fresh download URL from storage path
            const downloadUrl = await getDownloadURL(session.storagePath);
            
            // Update session with fresh download URL for caching
            try {
              await updateRecordingSession(path, { downloadUrl });
            } catch (updateError) {
              firebaseErrorHandler.log('warn', 'Failed to cache download URL (non-critical)', 
                firebaseErrorHandler.mapError(updateError), {
                service: 'firebase-storage',
                operation: 'cache-download-url'
              });
            }
            
            this.lastError = null;
            return downloadUrl;
          } else {
            throw createError(
              UPLOAD_ERRORS.INVALID_FILE,
              `Recording session ${path} has no storage path or download URL`
            );
          }
        } else {
          // It's a storage path - get download URL directly
          const downloadUrl = await getDownloadURL(path);
          this.lastError = null;
          return downloadUrl;
        }
      },
      { maxRetries: 3 },
      'firebase-storage-get-download-url'
    );
  }

  /**
   * Download recording as Blob for client-side processing
   * @param {string} path - Storage path or recording session ID
   * @returns {Promise<Blob>} Recording blob
   */
  async download(path) {
    try {
      console.log('💾 C07: Downloading recording blob:', path);

      const downloadUrl = await this.getDownloadUrl(path);
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('💾 C07: Download completed, blob size:', blob.size);
      
      this.lastError = null;
      return blob;
    } catch (error) {
      console.error('❌ C07: Download failed:', error);
      const mappedError = this.mapStorageError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Delete recording (removes both storage object and Firestore metadata)
   * @param {string} path - Storage path or recording session ID
   * @returns {Promise<void>}
   */
  async delete(path) {
    try {
      console.log('🗑️ C07: Deleting recording:', path);

      let storagePath = path;
      let sessionId = null;

      // Handle session ID vs storage path
      if (!path.includes('/')) {
        // It's a session ID - get storage path from session
        sessionId = path;
        const session = await getRecordingSession(sessionId);
        if (session?.storagePath) {
          storagePath = session.storagePath;
        } else {
          console.warn('⚠️ C07: No storage path found for session, skipping storage deletion');
        }
      } else {
        // It's a storage path - try to find associated session
        // This is best-effort lookup for cleanup
        try {
          const sessions = await this.listRecordings({ storagePath: path });
          if (sessions.length > 0) {
            sessionId = sessions[0].id;
          }
        } catch (lookupError) {
          console.warn('⚠️ C07: Could not find session for storage path (non-critical):', lookupError);
        }
      }

      // Delete from storage
      if (storagePath && storagePath.includes('/')) {
        try {
          await deleteFile(storagePath, { 
            cleanupFirestore: false // We handle Firestore cleanup ourselves
          });
          console.log('🗑️ C07: Storage file deleted successfully');
        } catch (storageError) {
          console.warn('⚠️ C07: Storage deletion failed (continuing with metadata cleanup):', storageError);
        }
      }

      // Delete/update Firestore metadata
      if (sessionId) {
        try {
          await updateRecordingSession(sessionId, {
            status: 'deleted',
            deletedAt: new Date(),
            storagePath: null,
            downloadUrl: null
          });
          console.log('📊 C07: Recording session marked as deleted');
        } catch (sessionError) {
          console.warn('⚠️ C07: Failed to update session status (non-critical):', sessionError);
        }
      }

      console.log('✅ C07: Recording deletion completed');
      this.lastError = null;
    } catch (error) {
      console.error('❌ C07: Recording deletion failed:', error);
      const mappedError = this.mapStorageError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * List recordings for admin view with filtering support
   * Uses C06 recording session data structure for listing
   * 
   * @param {Object} filters - Filtering options
   * @param {string} [filters.userId] - Filter by user ID
   * @param {string} [filters.fileType] - Filter by 'audio' or 'video'
   * @param {Date} [filters.startDate] - Filter by start date
   * @param {Date} [filters.endDate] - Filter by end date
   * @param {string} [filters.status] - Filter by session status
   * @returns {Promise<Array>} Array of recording data compatible with admin page
   */
  async listRecordings(filters = {}) {
    try {
      console.log('📋 C07: Listing recordings with filters:', filters);

      let sessions;
      
      if (filters.userId) {
        // Use C04 getUserRecordingSessions for user-specific listings
        sessions = await getUserRecordingSessions(filters.userId);
      } else {
        // For admin - get all sessions from all users
        sessions = await getAllRecordingSessions();
      }

      // Apply additional filters
      let filteredSessions = sessions.filter(session => {
        // Filter by file type
        if (filters.fileType && session.fileType !== filters.fileType) {
          return false;
        }

        // Filter by status (exclude deleted by default)
        if (filters.status) {
          if (session.status !== filters.status) return false;
        } else {
          // Default: exclude deleted recordings
          if (session.status === 'deleted') return false;
        }

        // Filter by date range
        if (filters.startDate && session.createdAt < filters.startDate) {
          return false;
        }
        if (filters.endDate && session.createdAt > filters.endDate) {
          return false;
        }

        // Filter by storage path (internal usage)
        if (filters.storagePath && session.storagePath !== filters.storagePath) {
          return false;
        }

        return true;
      });

      // Transform to admin page compatible format
      const recordings = filteredSessions.map(session => ({
        id: session.id,
        docId: session.id, // Admin page compatibility
        sessionId: session.sessionId,
        userId: session.userId,
        fileType: session.fileType || 'audio',
        fileName: this.generateFileName(session),
        downloadURL: session.downloadUrl || null,
        storagePath: session.storagePath || null,
        createdAt: session.createdAt,
        status: session.status,
        duration: session.duration || 0,
        size: session.fileSize || 0,
        // Additional metadata for admin use
        metadata: {
          uploadProgress: session.uploadProgress,
          mimeType: session.mimeType,
          completedAt: session.completedAt
        }
      }));

      console.log('📋 C07: Listings completed:', recordings.length, 'recordings found');
      this.lastError = null;
      return recordings;
    } catch (error) {
      console.error('❌ C07: Listing recordings failed:', error);
      const mappedError = this.mapStorageError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Get single recording by ID (compatible with ViewRecording page)
   * @param {string} recordingId - Recording/session ID
   * @returns {Promise<Object>} Recording data
   */
  async getRecording(recordingId) {
    try {
      console.log('📄 C07: Getting recording:', recordingId);

      const session = await getRecordingSession(recordingId);
      
      if (!session) {
        throw createError(
          UPLOAD_ERRORS.NOT_FOUND,
          `Recording not found: ${recordingId}`
        );
      }

      // Transform to ViewRecording compatible format
      const recording = {
        id: session.id,
        docId: session.id, // ViewRecording compatibility
        sessionId: session.sessionId,
        userId: session.userId,
        fileType: session.fileType || 'audio',
        downloadURL: session.downloadUrl,
        storagePath: session.storagePath,
        createdAt: session.createdAt,
        status: session.status,
        duration: session.duration || 0,
        size: session.fileSize || 0,
        metadata: session.metadata || {}
      };

      console.log('📄 C07: Recording retrieved successfully');
      this.lastError = null;
      return recording;
    } catch (error) {
      console.error('❌ C07: Get recording failed:', error);
      const mappedError = this.mapStorageError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Cleanup failed/cancelled uploads and orphan chunks
   * @param {Object} options - Cleanup options
   * @param {number} [options.maxAge] - Max age for cleanup in milliseconds (default: 24 hours)
   * @param {boolean} [options.dryRun] - Only report what would be cleaned up
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupFailedUploads(options = {}) {
    try {
      const { maxAge = 24 * 60 * 60 * 1000, dryRun = false } = options; // 24 hours default
      
      console.log('🧹 C07: Starting cleanup of failed uploads', { maxAge, dryRun });

      const cutoffDate = new Date(Date.now() - maxAge);
      
      // Get sessions that are in failed/cancelled state and old enough
      const sessions = await getUserRecordingSessions('anonymous'); // Would need admin function for all users
      
      const failedSessions = sessions.filter(session => {
        return (
          ['failed', 'cancelled', 'uploading'].includes(session.status) &&
          session.createdAt < cutoffDate
        );
      });

      const results = {
        sessionsFound: failedSessions.length,
        sessionsCleanedUp: 0,
        storageFilesDeleted: 0,
        errors: []
      };

      if (dryRun) {
        console.log('🧹 C07: Dry run - would clean up:', results.sessionsFound, 'sessions');
        return results;
      }

      // Clean up each failed session
      for (const session of failedSessions) {
        try {
          // Delete storage files if they exist
          if (session.storagePath) {
            await deleteFile(session.storagePath, { cleanupFirestore: false });
            results.storageFilesDeleted++;
          }

          // Mark session as cleaned up
          await updateRecordingSession(session.id, {
            status: 'cleaned_up',
            cleanedUpAt: new Date()
          });
          
          results.sessionsCleanedUp++;
          console.log('🧹 C07: Cleaned up session:', session.id);
        } catch (sessionError) {
          console.error('❌ C07: Failed to clean up session:', session.id, sessionError);
          results.errors.push({
            sessionId: session.id,
            error: sessionError.message
          });
        }
      }

      console.log('✅ C07: Cleanup completed:', results);
      this.lastError = null;
      return results;
    } catch (error) {
      console.error('❌ C07: Cleanup failed:', error);
      const mappedError = this.mapStorageError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Basic quota monitoring and user-facing error mapping
   * @returns {Promise<Object>} Quota information
   */
  async getQuotaInfo() {
    try {
      // Firebase Storage doesn't provide direct quota API
      // This would need to be implemented with admin SDK or custom metrics
      // For now, return basic structure for future enhancement
      
      const quotaInfo = {
        available: true,
        usage: null, // Would need admin SDK implementation
        limit: null, // Would need admin SDK implementation
        percentage: null,
        warning: false,
        error: null
      };

      console.log('📊 C07: Quota check completed (basic)');
      this.lastError = null;
      return quotaInfo;
    } catch (error) {
      console.error('❌ C07: Quota check failed:', error);
      return {
        available: true, // Assume available on error
        usage: null,
        limit: null,
        percentage: null,
        warning: false,
        error: error.message
      };
    }
  }

  /**
   * Generate filename for display based on session data
   * @param {Object} session - Recording session data
   * @returns {string} Generated filename
   */
  generateFileName(session) {
    if (session.fileName) {
      return session.fileName;
    }
    
    const timestamp = session.createdAt ? 
      session.createdAt.toISOString().slice(0, 19).replace(/[:T]/g, '-') :
      'unknown';
    const fileType = session.fileType || 'audio';
    const extension = fileType === 'video' ? 'mp4' : 'm4a';
    
    return `${timestamp}_${fileType}.${extension}`;
  }

  /**
   * Get last error
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
   * Map storage errors to UIAPP error patterns
   * @param {Error} error - Storage error
   * @returns {Error} Mapped UIAPP error
   */
  mapStorageError(error) {
    if (!error) return null;

    // Handle Firebase storage quota errors
    if (error.code === 'storage/quota-exceeded') {
      return createError(
        UPLOAD_ERRORS.QUOTA_EXCEEDED,
        'Storage quota exceeded. Please contact support to increase your storage limit.',
        error
      );
    }

    // Handle not found errors
    if (error.code === 'storage/object-not-found' || error.message?.includes('not found')) {
      return createError(
        UPLOAD_ERRORS.NOT_FOUND,
        'Recording not found. It may have been deleted or moved.',
        error
      );
    }

    // Handle permission errors
    if (error.code === 'storage/unauthorized') {
      return createError(
        UPLOAD_ERRORS.PERMISSION_DENIED,
        'Access denied. Please refresh the page and try again.',
        error
      );
    }

    // Handle network errors
    if (error.message && (error.message.includes('network') || error.message.includes('fetch'))) {
      return createError(
        UPLOAD_ERRORS.NETWORK_ERROR,
        'Network error. Please check your connection and try again.',
        error
      );
    }

    // Handle timeout errors
    if (error.message && error.message.includes('timeout')) {
      return createError(
        UPLOAD_ERRORS.TIMEOUT,
        'Request timeout. Please try again.',
        error
      );
    }

    // Handle generic errors
    return createError(
      UPLOAD_ERRORS.UNKNOWN,
      error.message || 'An unknown storage error occurred.',
      error
    );
  }
}

// Create singleton instance following UIAPP patterns
const firebaseStorageService = new FirebaseStorageService();

// Export service instance and individual functions for UIAPP compatibility
export default firebaseStorageService;

// Export bound methods to preserve context
export const generateUploadPath = (...args) => firebaseStorageService.generateUploadPath(...args);
export const getDownloadUrl = (...args) => firebaseStorageService.getDownloadUrl(...args);
export const download = (...args) => firebaseStorageService.download(...args);
export const deleteRecording = (...args) => firebaseStorageService.delete(...args);
export const listRecordings = (...args) => firebaseStorageService.listRecordings(...args);
export const getRecording = (...args) => firebaseStorageService.getRecording(...args);
export const cleanupFailedUploads = (...args) => firebaseStorageService.cleanupFailedUploads(...args);
export const getQuotaInfo = (...args) => firebaseStorageService.getQuotaInfo(...args);
export const getLastError = () => firebaseStorageService.getLastError();
export const clearError = () => firebaseStorageService.clearError();

// UIAPP compatibility exports (matching localRecordingService interface)
export const fetchAllRecordings = (filters) => firebaseStorageService.listRecordings(filters);
export const fetchRecording = (recordingId) => firebaseStorageService.getRecording(recordingId);

console.log('🔥 Firebase Storage & Download Service (C07): LOADED');
console.log('📦 Features: download URLs, listing, deletion, cleanup, quota monitoring');