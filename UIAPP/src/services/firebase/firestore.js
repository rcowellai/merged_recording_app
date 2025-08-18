/**
 * 🔥 Firebase Firestore Service for UIAPP (C02)
 * ==============================================
 * 
 * DEVELOPER HANDOFF NOTES:
 * - Rewritten from MVPAPP stories.js using UIAPP patterns
 * - Maintains same Firestore functionality with UIAPP error handling
 * - Integrates with UIAPP's structured error system in utils/errors.js
 * - Follows UIAPP service conventions (same interface as localRecordingService.js)
 * - Uses same collection patterns and data structures as MVPAPP
 * 
 * MVPAPP SOURCE: recording-app/src/services/stories.js
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
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  createError, 
  UPLOAD_ERRORS 
} from '../../utils/errors';

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
   * Update recording session status and data
   * @param {string} sessionId - Session ID to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<void>}
   */
  async updateRecordingSession(sessionId, updateData) {
    try {
      console.log('📝 Updating recording session:', sessionId);
      
      const docRef = doc(db, 'recordingSessions', sessionId);
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      
      console.log('📝 Recording session updated successfully');
      this.lastError = null;
    } catch (error) {
      console.error('Error updating recording session:', error);
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
   * @param {Error} error - Firestore error
   * @returns {Error} Mapped UIAPP error
   */
  mapFirestoreError(error) {
    if (!error) return null;

    // Handle Firestore errors
    if (error.code && error.code.startsWith('firestore/')) {
      switch (error.code) {
        case 'firestore/permission-denied':
          return createError(
            UPLOAD_ERRORS.PERMISSION_DENIED,
            'Permission denied. Please check your authentication.',
            error
          );
        case 'firestore/not-found':
          return createError(
            UPLOAD_ERRORS.NOT_FOUND,
            'Document not found.',
            error
          );
        case 'firestore/network-error':
          return createError(
            UPLOAD_ERRORS.NETWORK_ERROR,
            'Network connection failed. Please check your internet connection.',
            error
          );
        case 'firestore/quota-exceeded':
          return createError(
            UPLOAD_ERRORS.QUOTA_EXCEEDED,
            'Database quota exceeded. Please try again later.',
            error
          );
        case 'firestore/timeout':
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
}

// Create singleton instance following UIAPP patterns
const firebaseFirestoreService = new FirebaseFirestoreService();

// Export service instance and individual functions for flexibility
export default firebaseFirestoreService;

export const {
  subscribeToUserStories,
  getUserStories,
  getStoryById,
  createStory,
  updateStory,
  deleteStory,
  getRecordingSession,
  updateRecordingSession,
  getLastError,
  clearError,
  cleanup
} = firebaseFirestoreService;

// Export utility functions as static methods
export const { formatDuration, formatDate } = FirebaseFirestoreService;

console.log('📚 Firebase Firestore Service: LOADED');