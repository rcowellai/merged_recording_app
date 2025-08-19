/**
 * 🔥 Firebase Services Index for UIAPP (C02)
 * ==========================================
 * 
 * DEVELOPER HANDOFF NOTES:
 * - Central export point for all Firebase services
 * - Provides both named exports and default service instances
 * - Follows UIAPP service organization patterns
 * - Enables tree-shaking for unused services
 * - Provides unified interface for Firebase functionality
 * 
 * USAGE PATTERNS:
 * - Import individual services: import { firebaseAuth, firebaseStorage } from './services/firebase'
 * - Import specific functions: import { validateSession, uploadRecording } from './services/firebase'
 * - Import entire service: import firebaseAuth from './services/firebase/auth'
 */

// Import service instances
import firebaseAuthService from './auth';
import firebaseFirestoreService from './firestore';
import firebaseStorageService from './storage';
import firebaseFunctionsService from './functions';

// Import Firebase config
import { auth, db, storage, functions, initializeAnonymousAuth } from '../../config/firebase';

// Export service instances
export { default as firebaseAuth } from './auth';
export { default as firebaseFirestore } from './firestore';
export { default as firebaseStorage } from './storage';
export { default as firebaseFunctions } from './functions';

// Export individual service methods for convenience
export {
  // Auth service methods
  initializeAuth,
  signInAnonymously,
  getCurrentUser,
  checkAuthentication,
  onAuthStateChange,
  getAuthError,
  clearAuthError,
  signOut,
  getAuthStatus,
  cleanupAuth
} from './auth';

export {
  // Firestore service methods
  subscribeToUserStories,
  getUserStories,
  getStoryById,
  createStory,
  updateStory,
  deleteStory,
  getRecordingSession,
  createRecordingSession,
  updateRecordingSession,
  formatDuration,
  formatDate
} from './firestore';

export {
  // Storage service methods
  getBestSupportedMimeType,
  uploadRecording,
  uploadMemoryRecording,  // C05: Memory recording upload
  getDownloadURL,
  getSignedUrl,           // C05: Signed URL generation
  deleteFile,
  linkStorageToFirestore, // C05: Firestore integration
  getFileMetadata,
  cancelUpload,
  getUploadStatus,
  getActiveUploads,
  downloadStoryMedia
} from './storage';

export {
  // Functions service methods
  validateSession,
  getEnhancedSessionStatus,
  getSessionStatusMessage,
  canRecord,
  getStatusCategory,
  isErrorStatus,
  isCompletedStatus,
  isProgressStatus
} from './functions';

export {
  // Recording service methods (C06)
  uploadRecordingWithMetadata,
  resumeRecordingUpload,
  cancelRecordingUpload,
  getRecordingUploadProgress,
  isRecordingUploadEnabled,
  validateRecordingUpload
} from './recording';

// Export Firebase SDK instances for direct access
export {
  auth,
  db,
  storage,
  functions,
  initializeAnonymousAuth
};

// Unified Firebase service object for easy import
export const firebaseServices = {
  auth: firebaseAuthService,
  firestore: firebaseFirestoreService,
  storage: firebaseStorageService,
  functions: firebaseFunctionsService
};

// Unified cleanup function
export const cleanupAllFirebaseServices = () => {
  console.log('🧹 Cleaning up all Firebase services...');
  firebaseAuthService.cleanup();
  firebaseFirestoreService.cleanup();
  firebaseStorageService.cleanup();
};

// Service status checker
export const getFirebaseServicesStatus = () => {
  return {
    auth: firebaseAuthService.getStatus(),
    firestore: {
      lastError: firebaseFirestoreService.getLastError(),
      hasError: !!firebaseFirestoreService.getLastError()
    },
    storage: {
      lastError: firebaseStorageService.getLastError(),
      hasError: !!firebaseStorageService.getLastError(),
      activeUploads: firebaseStorageService.getActiveUploads().size
    },
    functions: {
      lastError: firebaseFunctionsService.getLastError(),
      hasError: !!firebaseFunctionsService.getLastError()
    }
  };
};

console.log('🔥 Firebase Services Module: LOADED');
console.log('📊 Available services: auth, firestore, storage, functions');