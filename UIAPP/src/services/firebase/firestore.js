/**
 * 🔥 Firebase Firestore Service for UIAPP (C04 - Enhanced)
 * ========================================================
 * 
 * DEVELOPER HANDOFF NOTES:
 * - Enhanced from C02 basic implementation with full recording workflow
 * - Rewritten from MVPAPP stories.js + unifiedRecording.js patterns
 * - Maintains same Firestore functionality with UIAPP error handling
 * - Integrates with UIAPP's structured error system in utils/errors.js
 * - Follows UIAPP service conventions (same interface as localRecordingService.js)
 * - Uses same collection patterns and data structures as MVPAPP
 * 
 * C04 ENHANCEMENTS:
 * - Recording session lifecycle management (create, status transitions)
 * - Upload reference tracking (storage → firestore mapping)
 * - Recording progress tracking (following MVPAPP patterns)
 * - Enhanced metadata support (fileSize, mimeType, storagePaths)
 * 
 * COLLECTIONS SUPPORTED:
 * - stories: User story documents with media references
 * - recordingSessions: Recording session lifecycle and metadata
 * - uploadReferences: Storage path tracking and cleanup
 * 
 * MVPAPP SOURCES: 
 * - recording-app/src/services/stories.js → stories operations
 * - recording-app/src/services/unifiedRecording.js → session lifecycle
 * UIAPP TARGET: src/services/firebase/firestore.js
 * CONVENTIONS: UIAPP error handling, config patterns, service interfaces
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  createError, 
  UPLOAD_ERRORS 
} from '../../utils/errors';
import { 
  updateRecordingStatusAtomic as updateRecordingStatusAtomicUtil,
  executeWithRetry 
} from './transactions.js';

/**
 * Firebase Firestore Service
 * Provides database operations with UIAPP error handling patterns
 */
class FirebaseFirestoreService {
  constructor() {
    this.lastError = null;
    this.activeSubscriptions = new Map();
  }

  /**
   * Subscribe to user's stories with real-time updates
   * Maintains same interface as MVPAPP subscribeToUserStories
   * 
   * @param {string} userId - User ID to fetch stories for
   * @param {function} callback - Callback function to handle story updates
   * @returns {function} Unsubscribe function
   */
  subscribeToUserStories(userId, callback) {
    try {
      console.log('📚 Setting up real-time stories subscription for user:', userId);
      
      const q = query(
        collection(db, 'stories'),
        where('userId', '==', userId),
        orderBy('recordedAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const stories = [];
          snapshot.forEach((doc) => {
            stories.push({ 
              id: doc.id, 
              ...doc.data(),
              // Convert Firestore timestamps to JavaScript dates
              recordedAt: doc.data().recordedAt?.toDate(),
              createdAt: doc.data().createdAt?.toDate()
            });
          });
          
          console.log('📚 Stories updated:', stories.length, 'stories found');
          this.lastError = null;
          callback(stories);
        } catch (error) {
          console.error('Error processing stories snapshot:', error);
          const mappedError = this.mapFirestoreError(error);
          this.lastError = mappedError;
          callback(null, mappedError);
        }
      }, (error) => {
        console.error('Error in stories subscription:', error);
        const mappedError = this.mapFirestoreError(error);
        this.lastError = mappedError;
        callback(null, mappedError);
      });
      
      // Store subscription for cleanup
      const subscriptionId = `stories_${userId}_${Date.now()}`;
      this.activeSubscriptions.set(subscriptionId, unsubscribe);
      
      // Return enhanced unsubscribe function
      return () => {
        unsubscribe();
        this.activeSubscriptions.delete(subscriptionId);
      };
    } catch (error) {
      console.error('Error setting up stories subscription:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Get all stories for a user (one-time fetch)
   * Maintains same interface as MVPAPP getUserStories
   * 
   * @param {string} userId - User ID to fetch stories for
   * @returns {Promise<Array>} Array of stories
   */
  async getUserStories(userId) {
    try {
      console.log('📚 Fetching stories for user:', userId);
      
      const q = query(
        collection(db, 'stories'),
        where('userId', '==', userId),
        orderBy('recordedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const stories = [];
      
      snapshot.forEach((doc) => {
        stories.push({ 
          id: doc.id, 
          ...doc.data(),
          recordedAt: doc.data().recordedAt?.toDate(),
          createdAt: doc.data().createdAt?.toDate()
        });
      });
      
      console.log('📚 Stories fetched:', stories.length, 'stories found');
      this.lastError = null;
      return stories;
    } catch (error) {
      console.error('Error fetching user stories:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Get a single story by ID
   * Maintains same interface as MVPAPP getStoryById
   * 
   * @param {string} storyId - Story ID to fetch
   * @returns {Promise<Object>} Story object
   */
  async getStoryById(storyId) {
    try {
      console.log('📚 Fetching story by ID:', storyId);
      
      const docRef = doc(db, 'stories', storyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const story = {
          id: docSnap.id,
          ...data,
          recordedAt: data.recordedAt?.toDate(),
          createdAt: data.createdAt?.toDate()
        };
        
        console.log('📚 Story found:', story.id);
        this.lastError = null;
        return story;
      } else {
        const error = new Error('Story not found');
        const mappedError = this.mapFirestoreError(error);
        this.lastError = mappedError;
        throw mappedError;
      }
    } catch (error) {
      console.error('Error fetching story:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Get all recording sessions for a user
   * @param {string} userId - User ID to fetch sessions for
   * @returns {Promise<Array>} Array of recording sessions
   */
  async getUserRecordingSessions(userId) {
    try {
      console.log('📝 Fetching recording sessions for user:', userId);
      
      const q = query(
        collection(db, 'recordingSessions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const sessions = [];
      
      snapshot.forEach((doc) => {
        sessions.push({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          expiresAt: doc.data().expiresAt?.toDate(),
          recordingStartedAt: doc.data().recordingStartedAt?.toDate(),
          recordingCompletedAt: doc.data().recordingCompletedAt?.toDate()
        });
      });
      
      console.log('📝 Recording sessions fetched:', sessions.length, 'sessions found');
      this.lastError = null;
      return sessions;
    } catch (error) {
      console.error('Error fetching user recording sessions:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Get ALL recording sessions for admin purposes
   * Queries all recordingSessions without userId filtering
   * @returns {Promise<Array>} Array of all recording sessions
   */
  async getAllRecordingSessions() {
    try {
      console.log('📝 Fetching ALL recording sessions for admin view');
      
      const q = query(
        collection(db, 'recordingSessions'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const sessions = [];
      
      snapshot.forEach((doc) => {
        sessions.push({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          expiresAt: doc.data().expiresAt?.toDate(),
          recordingStartedAt: doc.data().recordingStartedAt?.toDate(),
          recordingCompletedAt: doc.data().recordingCompletedAt?.toDate()
        });
      });
      
      console.log('📝 ALL recording sessions fetched:', sessions.length, 'sessions found from all users');
      this.lastError = null;
      return sessions;
    } catch (error) {
      console.error('Error fetching all recording sessions:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Create a new story document
   * Follows UIAPP patterns for data creation
   * 
   * @param {Object} storyData - Story data to create
   * @returns {Promise<string>} Created document ID
   */
  async createStory(storyData) {
    try {
      console.log('📚 Creating new story...');
      
      const docRef = await addDoc(collection(db, 'stories'), {
        ...storyData,
        createdAt: serverTimestamp(),
        recordedAt: storyData.recordedAt || serverTimestamp()
      });
      
      console.log('📚 Story created with ID:', docRef.id);
      this.lastError = null;
      return docRef.id;
    } catch (error) {
      console.error('Error creating story:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Update an existing story document
   * @param {string} storyId - Story ID to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<void>}
   */
  async updateStory(storyId, updateData) {
    try {
      console.log('📚 Updating story:', storyId);
      
      const docRef = doc(db, 'stories', storyId);
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      
      console.log('📚 Story updated successfully');
      this.lastError = null;
    } catch (error) {
      console.error('Error updating story:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Delete a story document
   * @param {string} storyId - Story ID to delete
   * @returns {Promise<void>}
   */
  async deleteStory(storyId) {
    try {
      console.log('📚 Deleting story:', storyId);
      
      const docRef = doc(db, 'stories', storyId);
      await deleteDoc(docRef);
      
      console.log('📚 Story deleted successfully');
      this.lastError = null;
    } catch (error) {
      console.error('Error deleting story:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Get recording session data
   * Used for session validation and recording management
   * 
   * @param {string} sessionId - Session ID to fetch
   * @returns {Promise<Object>} Session data
   */
  async getRecordingSession(sessionId) {
    try {
      console.log('📝 Fetching recording session:', sessionId);
      
      const docRef = doc(db, 'recordingSessions', sessionId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const session = {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          expiresAt: data.expiresAt?.toDate(),
          recordingCompletedAt: data.recordingCompletedAt?.toDate()
        };
        
        console.log('📝 Recording session found:', session.id);
        this.lastError = null;
        return session;
      } else {
        const error = new Error('Recording session not found');
        const mappedError = this.mapFirestoreError(error);
        this.lastError = mappedError;
        throw mappedError;
      }
    } catch (error) {
      console.error('Error fetching recording session:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Validate recording session directly from Firestore
   * Primary validation path - 10x faster than Cloud Function
   *
   * @param {string} sessionId - Session ID to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateRecordingSessionDirect(sessionId) {
    try {
      const docRef = doc(db, 'recordingSessions', sessionId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return {
          status: 'not_found',
          message: 'This recording link is invalid or has been removed.',
          isValid: false,
          method: 'direct-firestore'
        };
      }

      const data = docSnap.data();

      // Check expiration
      if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
        const daysAgo = Math.floor((Date.now() - data.expiresAt.toDate().getTime()) / (1000 * 60 * 60 * 24));
        return {
          status: 'expired',
          message: `This recording link expired ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago.`,
          isValid: false,
          method: 'direct-firestore'
        };
      }

      // Check completion status
      if (data.status === 'Completed' || data.status === 'ReadyForTranscription') {
        return {
          status: 'already_completed',
          message: 'This recording has already been completed.',
          isValid: false,
          method: 'direct-firestore'
        };
      }

      // Valid session
      return {
        status: 'valid',
        message: 'Session is valid',
        isValid: true,
        method: 'direct-firestore',
        sessionData: {
          questionText: data.promptText || data.questionText,
          storytellerName: data.storytellerName,
          askerName: data.askerName,
          createdAt: data.createdAt?.toDate()?.toISOString(),
          expiresAt: data.expiresAt?.toDate()?.toISOString(),
        },
        session: {
          promptText: data.promptText || data.questionText,
          storytellerName: data.storytellerName,
          askerName: data.askerName,
          createdAt: data.createdAt?.toDate()?.toISOString(),
          expiresAt: data.expiresAt?.toDate()?.toISOString(),
          status: data.status
        },
        fullUserId: data.userId,
        sessionDocument: data
      };

    } catch (error) {
      console.error('❌ Direct validation failed:', error);
      return {
        status: 'error',
        message: `Validation error: ${error.message}`,
        isValid: false,
        fallbackRequired: true,  // Signals fallback needed
        method: 'direct-firestore'
      };
    }
  }

  /**
   * Create a new recording session document
   * @param {string} sessionId - Session ID
   * @param {Object} sessionData - Initial session data
   * @returns {Promise<void>}
   */
  async createRecordingSession(sessionId, sessionData) {
    try {
      console.log('📝 Creating recording session:', sessionId);
      
      const docRef = doc(db, 'recordingSessions', sessionId);
      await setDoc(docRef, {
        ...sessionData,
        // Preserve status from sessionData instead of hardcoding to 'pending'
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        recordingData: sessionData.recordingData || {},
        storagePaths: sessionData.storagePaths || [],
        uploadProgress: sessionData.uploadProgress || 0
      });
      
      console.log('📝 Recording session created successfully');
      this.lastError = null;
    } catch (error) {
      console.error('Error creating recording session:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Update recording session status and data
   * @param {string} sessionId - Session ID to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<void>}
   */
  async updateRecordingSession(sessionId, updateData) {
    try {
      const docRef = doc(db, 'recordingSessions', sessionId);

      const finalUpdateData = {
        ...updateData,
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, finalUpdateData);

      this.lastError = null;
    } catch (error) {
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Update recording session status with metadata
   * Following MVPAPP pattern for status transitions
   * @param {string} sessionId - Session ID
   * @param {string} status - New status (pending, recording, uploading, processing, completed, failed)
   * @param {Object} metadata - Additional metadata to store
   * @returns {Promise<void>}
   */
  /**
   * Updates recording status with field preservation
   * TACTICAL FIXES APPLIED:
   * - Uses dot notation for recordingData updates to preserve existing fields
   * - Validates fileType preservation in recordingData
   * - Standardized status naming to 'Uploading' (capitalized)
   */
  async updateRecordingStatus(sessionId, status, metadata = {}) {
    try {
      console.log('📝 Updating recording status:', sessionId, '→', status);
      
      const updateData = {
        status,
        updatedAt: serverTimestamp()
      };

      // Add metadata based on status
      if (status === 'recording' && metadata.recordingStartedAt) {
        updateData.recordingStartedAt = metadata.recordingStartedAt;
      }
      
      if (status === 'Uploading' && metadata.recordingData) {
        // Use dot notation to preserve existing recordingData fields
        Object.keys(metadata.recordingData).forEach(key => {
          updateData[`recordingData.${key}`] = metadata.recordingData[key];
        });
        
        // Validation: Ensure fileType is preserved in recordingData if available
        if (metadata.fileType && !metadata.recordingData.fileType) {
          updateData['recordingData.fileType'] = metadata.fileType;
          console.log('🔍 VALIDATION: Added missing fileType to recordingData:', metadata.fileType);
        }
        
        // Enhanced validation: Ensure both locations have fileType for compatibility
        if (metadata.fileType) {
          updateData['recordingData.fileType'] = metadata.fileType; // Nested location (preferred)
          updateData.fileType = metadata.fileType; // Direct property (for backward compatibility)
          console.log('🔍 ENHANCED VALIDATION: Set fileType in both locations for compatibility:', metadata.fileType);
        }
      }
      
      if (status === 'completed' && metadata.recordingCompletedAt) {
        updateData.recordingCompletedAt = metadata.recordingCompletedAt;
        updateData.uploadProgress = 100;
      }
      
      if (metadata.error) {
        updateData.error = metadata.error;
      }
      
      // Update recording session
      const docRef = doc(db, 'recordingSessions', sessionId);
      await updateDoc(docRef, updateData);
      
      console.log('📝 Recording status updated successfully to:', status);
      this.lastError = null;
    } catch (error) {
      console.error('Error updating recording status:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Update recording upload progress
   * Following MVPAPP pattern for progress tracking
   * @param {string} sessionId - Session ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {Object} additionalData - Additional progress data
   * @returns {Promise<void>}
   */
  async updateRecordingProgress(sessionId, progress, additionalData = {}) {
    try {
      console.log('📊 Updating recording progress:', sessionId, '→', progress + '%');
      
      const updateData = {
        uploadProgress: Math.round(progress),
        updatedAt: serverTimestamp()
      };
      
      // Add additional progress data if provided
      if (additionalData.bytesTransferred) {
        updateData['recordingData.bytesTransferred'] = additionalData.bytesTransferred;
      }
      
      if (additionalData.totalBytes) {
        updateData['recordingData.totalBytes'] = additionalData.totalBytes;
      }
      
      const docRef = doc(db, 'recordingSessions', sessionId);
      await updateDoc(docRef, updateData);
      
      this.lastError = null;
    } catch (error) {
      console.error('Error updating recording progress:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Add storage path reference to recording session
   * Links uploaded files to the recording session for cleanup and management
   * @param {string} sessionId - Session ID
   * @param {string} storagePath - Firebase Storage path
   * @param {Object} metadata - File metadata (type, size, etc.)
   * @returns {Promise<void>}
   */
  async addUploadReference(sessionId, storagePath, metadata = {}) {
    try {
      console.log('📎 Adding upload reference:', sessionId, '→', storagePath);
      
      const uploadRef = {
        path: storagePath,
        uploadedAt: serverTimestamp(),
        ...metadata
      };
      
      const docRef = doc(db, 'recordingSessions', sessionId);
      await updateDoc(docRef, {
        storagePaths: arrayUnion(uploadRef),
        updatedAt: serverTimestamp()
      });
      
      console.log('📎 Upload reference added successfully');
      this.lastError = null;
    } catch (error) {
      console.error('Error adding upload reference:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Remove storage path reference from recording session
   * Used for cleanup of failed or cancelled uploads
   * @param {string} sessionId - Session ID
   * @param {string} storagePath - Firebase Storage path to remove
   * @returns {Promise<void>}
   */
  async removeUploadReference(sessionId, storagePath) {
    try {
      console.log('📎 Removing upload reference:', sessionId, '→', storagePath);
      
      // First get the current document to find the exact reference to remove
      const docRef = doc(db, 'recordingSessions', sessionId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentPaths = data.storagePaths || [];
        
        // Find and remove the matching path reference
        const pathToRemove = currentPaths.find(ref => ref.path === storagePath);
        if (pathToRemove) {
          await updateDoc(docRef, {
            storagePaths: arrayRemove(pathToRemove),
            updatedAt: serverTimestamp()
          });
          console.log('📎 Upload reference removed successfully');
        } else {
          console.warn('📎 Upload reference not found:', storagePath);
        }
      }
      
      this.lastError = null;
    } catch (error) {
      console.error('Error removing upload reference:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Get all upload references for a recording session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} Array of upload references
   */
  async getUploadReferences(sessionId) {
    try {
      console.log('📎 Getting upload references for session:', sessionId);
      
      const session = await this.getRecordingSession(sessionId);
      const references = session.storagePaths || [];
      
      console.log('📎 Found', references.length, 'upload references');
      this.lastError = null;
      return references;
    } catch (error) {
      console.error('Error getting upload references:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Get last Firestore operation error
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
   * Cleanup all active subscriptions
   */
  cleanup() {
    console.log('📚 Cleaning up Firestore subscriptions...');
    this.activeSubscriptions.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing:', error);
      }
    });
    this.activeSubscriptions.clear();
    this.lastError = null;
  }

  /**
   * Map Firebase Firestore errors to UIAPP error patterns
   * FIXED: Firestore v9+ uses error codes WITHOUT 'firestore/' prefix
   * @param {Error} error - Firestore error
   * @returns {Error} Mapped UIAPP error
   */
  mapFirestoreError(error) {
    if (!error) return null;

    // Handle Firestore errors (v9+ format: 'permission-denied', not 'firestore/permission-denied')
    if (error.code) {
      // Remove 'firestore/' prefix if present (backward compatibility)
      const errorCode = error.code.replace('firestore/', '');

      switch (errorCode) {
        case 'permission-denied':
          return createError(
            UPLOAD_ERRORS.PERMISSION_DENIED,
            'Permission denied. Please check your authentication.',
            error
          );
        case 'not-found':
          return createError(
            UPLOAD_ERRORS.NOT_FOUND,
            'Document not found.',
            error
          );
        case 'network-error':
        case 'unavailable':
          return createError(
            UPLOAD_ERRORS.NETWORK_ERROR,
            'Network connection failed. Please check your internet connection.',
            error
          );
        case 'quota-exceeded':
        case 'resource-exhausted':
          return createError(
            UPLOAD_ERRORS.QUOTA_EXCEEDED,
            'Database quota exceeded. Please try again later.',
            error
          );
        case 'deadline-exceeded':
        case 'timeout':
          return createError(
            UPLOAD_ERRORS.TIMEOUT,
            'Database operation timeout. Please try again.',
            error
          );
        default:
          return createError(
            UPLOAD_ERRORS.UNKNOWN,
            `Database operation failed: ${error.message}`,
            error
          );
      }
    }

    // Handle network errors
    if (error.message && error.message.includes('network')) {
      return createError(
        UPLOAD_ERRORS.NETWORK_ERROR,
        'Network connection failed. Please check your internet connection.',
        error
      );
    }

    // Handle timeout errors
    if (error.message && error.message.includes('timeout')) {
      return createError(
        UPLOAD_ERRORS.TIMEOUT,
        'Database operation timeout. Please try again.',
        error
      );
    }

    // Handle generic errors
    return createError(
      UPLOAD_ERRORS.UNKNOWN,
      error.message || 'An unknown database error occurred.',
      error
    );
  }

  /**
   * Format duration from seconds to readable format
   * Utility function for story display (from MVPAPP)
   * 
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration (e.g., "2:30")
   */
  static formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format date for display
   * Utility function for story display (from MVPAPP)
   * 
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  static formatDate(date) {
    if (!date) return 'Unknown date';
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * STEP 2: Transaction-aware status update with validation
   * Atomic status updates with state transition validation
   * 
   * @param {string} sessionId - Recording session document ID
   * @param {string} newStatus - New status to set
   * @param {Object} additionalFields - Additional fields to update
   * @returns {Promise<{previousStatus: string, newStatus: string}>}
   */
  async updateRecordingStatusAtomic(sessionId, newStatus, additionalFields = {}) {
    try {
      const result = await updateRecordingStatusAtomicUtil(sessionId, newStatus, additionalFields);

      this.lastError = null;
      return result;
      
    } catch (error) {
      console.error('❌ Atomic status update failed:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * STEP 2: Enhanced upload reference with retry logic
   * Transaction-safe upload reference tracking
   * 
   * @param {string} sessionId - Recording session document ID
   * @param {string} storagePath - Storage path to reference
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<void>}
   */
  async addUploadReferenceAtomic(sessionId, storagePath, metadata = {}) {
    try {
      console.log('📎 Adding upload reference atomically:', sessionId, '→', storagePath);
      
      await executeWithRetry(
        async () => {
          const uploadRef = {
            path: storagePath,
            uploadedAt: serverTimestamp(),
            ...metadata
          };
          
          const docRef = doc(db, 'recordingSessions', sessionId);
          await updateDoc(docRef, {
            storagePaths: arrayUnion(uploadRef),
            updatedAt: serverTimestamp()
          });
        },
        3, // maxRetries
        1000 // baseDelay
      );
      
      console.log('📎 Atomic upload reference added successfully');
      this.lastError = null;
      
    } catch (error) {
      console.error('Error adding upload reference atomically:', error);
      const mappedError = this.mapFirestoreError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }
}

// Create singleton instance following UIAPP patterns
const firebaseFirestoreService = new FirebaseFirestoreService();

// Export service instance and individual functions for flexibility
export default firebaseFirestoreService;

// Export bound methods to preserve 'this' context
export const subscribeToUserStories = firebaseFirestoreService.subscribeToUserStories.bind(firebaseFirestoreService);
export const getUserStories = firebaseFirestoreService.getUserStories.bind(firebaseFirestoreService);
export const getUserRecordingSessions = firebaseFirestoreService.getUserRecordingSessions.bind(firebaseFirestoreService); // C07: Recording session queries
export const getAllRecordingSessions = firebaseFirestoreService.getAllRecordingSessions.bind(firebaseFirestoreService); // Admin: All recording sessions
export const getStoryById = firebaseFirestoreService.getStoryById.bind(firebaseFirestoreService);
export const createStory = firebaseFirestoreService.createStory.bind(firebaseFirestoreService);
export const updateStory = firebaseFirestoreService.updateStory.bind(firebaseFirestoreService);
export const deleteStory = firebaseFirestoreService.deleteStory.bind(firebaseFirestoreService);
export const getRecordingSession = firebaseFirestoreService.getRecordingSession.bind(firebaseFirestoreService);
export const createRecordingSession = firebaseFirestoreService.createRecordingSession.bind(firebaseFirestoreService);
export const updateRecordingSession = firebaseFirestoreService.updateRecordingSession.bind(firebaseFirestoreService);
export const validateRecordingSessionDirect = firebaseFirestoreService.validateRecordingSessionDirect.bind(firebaseFirestoreService);
export const updateRecordingStatus = firebaseFirestoreService.updateRecordingStatus.bind(firebaseFirestoreService);
export const updateRecordingProgress = firebaseFirestoreService.updateRecordingProgress.bind(firebaseFirestoreService);
export const addUploadReference = firebaseFirestoreService.addUploadReference.bind(firebaseFirestoreService);
export const removeUploadReference = firebaseFirestoreService.removeUploadReference.bind(firebaseFirestoreService);
export const getUploadReferences = firebaseFirestoreService.getUploadReferences.bind(firebaseFirestoreService);
export const updateRecordingStatusAtomic = firebaseFirestoreService.updateRecordingStatusAtomic.bind(firebaseFirestoreService);
export const addUploadReferenceAtomic = firebaseFirestoreService.addUploadReferenceAtomic.bind(firebaseFirestoreService);
export const getLastError = firebaseFirestoreService.getLastError.bind(firebaseFirestoreService);
export const clearError = firebaseFirestoreService.clearError.bind(firebaseFirestoreService);
export const cleanup = firebaseFirestoreService.cleanup.bind(firebaseFirestoreService);

// Export utility functions as static methods
export const { formatDuration, formatDate } = FirebaseFirestoreService;

// Service initialization logging
if (typeof window !== 'undefined' && window.AppLogger) {
  window.AppLogger.service('FirebaseFirestore', '📚 Firebase Firestore Service: LOADED');
}