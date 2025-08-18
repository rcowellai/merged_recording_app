/**
 * 🔥 Firebase Authentication Service for UIAPP (C02)
 * ===================================================
 * 
 * DEVELOPER HANDOFF NOTES:
 * - Rewritten from MVPAPP authentication logic using UIAPP patterns
 * - Maintains same anonymous auth functionality with UIAPP error handling
 * - Integrates with UIAPP's structured error system in utils/errors.js
 * - Follows UIAPP service conventions (same interface as localRecordingService.js)
 * - Uses dependency injection pattern consistent with UIAPP config system
 * 
 * MVPAPP SOURCE: recording-app/src/services/firebase.js (auth functions)
 * UIAPP TARGET: src/services/firebase/auth.js
 * CONVENTIONS: UIAPP error handling, config patterns, service interfaces
 */

import { auth, initializeAnonymousAuth as baseInitAnonymousAuth } from '../../config/firebase';
import { 
  createError, 
  classifyStorageError,
  UPLOAD_ERRORS 
} from '../../utils/errors';

/**
 * Firebase Authentication Service
 * Provides anonymous authentication with UIAPP error handling patterns
 */
class FirebaseAuthService {
  constructor() {
    this.currentUser = null;
    this.authStateCallbacks = [];
    this.isInitialized = false;
    this.lastError = null;
    
    // Setup auth state monitoring
    this.setupAuthStateMonitoring();
  }

  /**
   * Initialize the authentication service
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log('🔒 Initializing Firebase Auth Service...');
      
      // Use the base anonymous auth function from firebase config
      const user = await baseInitAnonymousAuth();
      this.currentUser = user;
      this.isInitialized = true;
      this.lastError = null;
      
      console.log('✅ Firebase Auth Service initialized successfully');
      return user;
    } catch (error) {
      console.error('❌ Firebase Auth Service initialization failed:', error);
      this.lastError = this.mapAuthError(error);
      throw this.lastError;
    }
  }

  /**
   * Sign in anonymously with retry logic
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<User>} Firebase user
   */
  async signInAnonymously(maxRetries = 3) {
    try {
      const user = await baseInitAnonymousAuth(maxRetries);
      this.currentUser = user;
      this.lastError = null;
      return user;
    } catch (error) {
      console.error('Authentication failed:', error);
      this.lastError = this.mapAuthError(error);
      throw this.lastError;
    }
  }

  /**
   * Get current authenticated user
   * @returns {User|null} Current Firebase user or null
   */
  getCurrentUser() {
    return this.currentUser || auth.currentUser;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated() {
    const user = this.getCurrentUser();
    return !!(user && user.isAnonymous);
  }

  /**
   * Setup authentication state monitoring
   * Follows UIAPP patterns for state management
   */
  setupAuthStateMonitoring() {
    auth.onAuthStateChanged((user) => {
      console.log('🔄 Auth state changed:', user ? 'authenticated' : 'not authenticated');
      this.currentUser = user;
      
      // Notify all registered callbacks
      this.authStateCallbacks.forEach(callback => {
        try {
          callback(user);
        } catch (error) {
          console.error('Auth state callback error:', error);
        }
      });
    });
  }

  /**
   * Register callback for authentication state changes
   * @param {function} callback - Callback function to handle auth state changes
   * @returns {function} Unsubscribe function
   */
  onAuthStateChange(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    this.authStateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateCallbacks.indexOf(callback);
      if (index > -1) {
        this.authStateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get last authentication error
   * @returns {Error|null} Last authentication error or null
   */
  getAuthError() {
    return this.lastError;
  }

  /**
   * Clear authentication error
   */
  clearAuthError() {
    this.lastError = null;
  }

  /**
   * Sign out current user
   * @returns {Promise<void>}
   */
  async signOut() {
    try {
      await auth.signOut();
      this.currentUser = null;
      this.lastError = null;
      console.log('🔓 User signed out successfully');
    } catch (error) {
      console.error('Sign out failed:', error);
      this.lastError = this.mapAuthError(error);
      throw this.lastError;
    }
  }

  /**
   * Map Firebase auth errors to UIAPP error patterns
   * Consistent with UIAPP's error handling in utils/errors.js
   * 
   * @param {Error} error - Firebase auth error
   * @returns {Error} Mapped UIAPP error
   */
  mapAuthError(error) {
    if (!error) return null;

    // Handle Firebase auth errors
    if (error.code && error.code.startsWith('auth/')) {
      switch (error.code) {
        case 'auth/network-request-failed':
          return createError(
            UPLOAD_ERRORS.NETWORK_ERROR,
            'Network connection failed. Please check your internet connection and try again.',
            error
          );
        case 'auth/too-many-requests':
          return createError(
            UPLOAD_ERRORS.QUOTA_EXCEEDED,
            'Too many authentication attempts. Please try again later.',
            error
          );
        case 'auth/operation-not-allowed':
          return createError(
            UPLOAD_ERRORS.PERMISSION_DENIED,
            'Anonymous authentication is not enabled for this project.',
            error
          );
        case 'auth/invalid-api-key':
          return createError(
            UPLOAD_ERRORS.INVALID_CONFIG,
            'Invalid Firebase API configuration. Please contact support.',
            error
          );
        default:
          return createError(
            UPLOAD_ERRORS.UNKNOWN,
            `Authentication failed: ${error.message}`,
            error
          );
      }
    }

    // Handle network/timeout errors
    if (error.message && error.message.includes('timeout')) {
      return createError(
        UPLOAD_ERRORS.TIMEOUT,
        'Authentication timeout. Please check your connection and try again.',
        error
      );
    }

    // Handle generic errors
    return createError(
      UPLOAD_ERRORS.UNKNOWN,
      error.message || 'An unknown authentication error occurred.',
      error
    );
  }

  /**
   * Get authentication service status
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isAuthenticated: this.isAuthenticated(),
      currentUser: this.getCurrentUser(),
      lastError: this.lastError,
      hasError: !!this.lastError
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.authStateCallbacks = [];
    this.currentUser = null;
    this.lastError = null;
  }
}

// Create singleton instance following UIAPP patterns
const firebaseAuthService = new FirebaseAuthService();

// Export service instance and individual functions for flexibility
export default firebaseAuthService;

export const {
  initialize: initializeAuth,
  signInAnonymously,
  getCurrentUser,
  isAuthenticated: checkAuthentication,
  onAuthStateChange,
  getAuthError,
  clearAuthError,
  signOut,
  getStatus: getAuthStatus,
  cleanup: cleanupAuth
} = firebaseAuthService;

console.log('🔒 Firebase Authentication Service: LOADED');