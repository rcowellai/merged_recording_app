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
import { firebaseErrorHandler } from '../../utils/firebaseErrorHandler';
import AppLogger from '../../utils/AppLogger';

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
   * Initialize the authentication service with C08 retry logic
   * @returns {Promise<void>}
   */
  async initialize() {
    return await firebaseErrorHandler.withRetry(
      async () => {
        firebaseErrorHandler.log('info', 'Initializing Firebase Auth Service', null, {
          service: 'firebase-auth',
          operation: 'initialize'
        });
        
        // Use the base anonymous auth function from firebase config
        const user = await baseInitAnonymousAuth();
        this.currentUser = user;
        this.isInitialized = true;
        this.lastError = null;
        
        firebaseErrorHandler.log('info', 'Firebase Auth Service initialized successfully', null, {
          service: 'firebase-auth',
          operation: 'initialize'
        });
        
        return user;
      },
      { maxRetries: 3 },
      'firebase-auth-initialize'
    );
  }

  /**
   * Sign in anonymously with C08 retry logic
   * @param {number} maxRetries - Maximum retry attempts (deprecated - handled by C08)
   * @returns {Promise<User>} Firebase user
   */
  async signInAnonymously(maxRetries = 3) {
    return await firebaseErrorHandler.withRetry(
      async () => {
        const user = await baseInitAnonymousAuth(1); // Let C08 handle retries
        this.currentUser = user;
        this.lastError = null;
        return user;
      },
      { maxRetries },
      'firebase-auth-signin'
    );
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
   * Setup authentication state monitoring with C08 logging
   * Follows UIAPP patterns for state management
   */
  setupAuthStateMonitoring() {
    auth.onAuthStateChanged((user) => {
      firebaseErrorHandler.log('debug', 'Auth state changed', {
        authenticated: !!user,
        isAnonymous: user?.isAnonymous
      }, {
        service: 'firebase-auth',
        operation: 'auth-state-change'
      });
      
      this.currentUser = user;
      
      // Notify all registered callbacks
      this.authStateCallbacks.forEach(callback => {
        try {
          callback(user);
        } catch (error) {
          const mappedError = firebaseErrorHandler.mapError(error, 'firebase-auth-callback');
          firebaseErrorHandler.log('error', 'Auth state callback error', mappedError, {
            service: 'firebase-auth',
            operation: 'auth-callback'
          });
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
   * Sign out current user with C08 error handling
   * @returns {Promise<void>}
   */
  async signOut() {
    return await firebaseErrorHandler.withRetry(
      async () => {
        await auth.signOut();
        this.currentUser = null;
        this.lastError = null;
        firebaseErrorHandler.log('info', 'User signed out successfully', null, {
          service: 'firebase-auth',
          operation: 'signout'
        });
      },
      { maxRetries: 2 }, // Fewer retries for signout
      'firebase-auth-signout'
    );
  }

  /**
   * Map Firebase auth errors using C08 centralized error handler
   * @param {Error} error - Firebase auth error
   * @returns {Error} Mapped UIAPP error
   */
  mapAuthError(error) {
    return firebaseErrorHandler.mapError(error, 'firebase-auth');
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

// CRITICAL FIX: Bind methods to preserve 'this' context
// Destructuring loses 'this' binding, causing "Cannot set properties of undefined"
export const initializeAuth = firebaseAuthService.initialize.bind(firebaseAuthService);
export const signInAnonymously = firebaseAuthService.signInAnonymously.bind(firebaseAuthService);
export const getCurrentUser = firebaseAuthService.getCurrentUser.bind(firebaseAuthService);
export const checkAuthentication = firebaseAuthService.isAuthenticated.bind(firebaseAuthService);
export const onAuthStateChange = firebaseAuthService.onAuthStateChange.bind(firebaseAuthService);
export const getAuthError = firebaseAuthService.getAuthError.bind(firebaseAuthService);
export const clearAuthError = firebaseAuthService.clearAuthError.bind(firebaseAuthService);
export const signOut = firebaseAuthService.signOut.bind(firebaseAuthService);
export const getAuthStatus = firebaseAuthService.getStatus.bind(firebaseAuthService);
export const cleanupAuth = firebaseAuthService.cleanup.bind(firebaseAuthService);

AppLogger.service('FirebaseAuth', '🔒 Firebase Authentication Service: LOADED');