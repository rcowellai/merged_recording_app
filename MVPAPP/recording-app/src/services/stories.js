import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc,
  getDocs 
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from './firebase.js';

/**
 * Subscribe to user's stories with real-time updates
 * @param {string} userId - User ID to fetch stories for
 * @param {function} callback - Callback function to handle story updates
 * @returns {function} Unsubscribe function
 */
export const subscribeToUserStories = (userId, callback) => {
  try {
    const q = query(
      collection(db, 'stories'),
      where('userId', '==', userId),
      orderBy('recordedAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
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
      callback(stories);
    }, (error) => {
      console.error('Error fetching stories:', error);
      callback(null, error);
    });
  } catch (error) {
    console.error('Error setting up stories subscription:', error);
    throw error;
  }
};

/**
 * Get all stories for a user (one-time fetch)
 * @param {string} userId - User ID to fetch stories for
 * @returns {Promise<Array>} Array of stories
 */
export const getUserStories = async (userId) => {
  try {
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
    
    return stories;
  } catch (error) {
    console.error('Error fetching user stories:', error);
    throw error;
  }
};

/**
 * Get a single story by ID
 * @param {string} storyId - Story ID to fetch
 * @returns {Promise<Object>} Story object
 */
export const getStoryById = async (storyId) => {
  try {
    const docRef = doc(db, 'stories', storyId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        recordedAt: data.recordedAt?.toDate(),
        createdAt: data.createdAt?.toDate()
      };
    } else {
      throw new Error('Story not found');
    }
  } catch (error) {
    console.error('Error fetching story:', error);
    throw error;
  }
};

/**
 * Get download URL for audio/video files
 * @param {string} storagePath - Firebase Storage path (gs:// format)
 * @returns {Promise<string>} Download URL
 */
export const getMediaDownloadURL = async (storagePath) => {
  try {
    // Remove gs://bucket/ prefix and get the actual path
    const path = storagePath.replace(/^gs:\/\/[^\/]+\//, '');
    const mediaRef = ref(storage, path);
    return await getDownloadURL(mediaRef);
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw error;
  }
};

/**
 * Format duration from seconds to readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "2:30")
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Format date for display
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
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
};

/**
 * Download story media file
 * @param {Object} story - Story object
 * @param {string} type - 'audio' or 'video'
 */
export const downloadStoryMedia = async (story, type = 'audio') => {
  try {
    const mediaUrl = type === 'video' && story.videoUrl ? story.videoUrl : story.audioUrl;
    if (!mediaUrl) {
      throw new Error(`No ${type} file available for this story`);
    }
    
    const downloadUrl = await getMediaDownloadURL(mediaUrl);
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.question.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.${type === 'video' ? 'webm' : 'wav'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};