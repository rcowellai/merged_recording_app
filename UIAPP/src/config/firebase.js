/**
 * 🔥 Firebase Configuration for UIAPP (C02)
 * ============================================
 * 
 * DEVELOPER HANDOFF NOTES:
 * - Converted from MVPAPP firebase.js using REACT_APP_ environment variables
 * - Maintains same Firebase SDK v10.4.0 for compatibility
 * - Follows UIAPP config patterns and error handling conventions
 * - Integrates with existing UIAPP config system in src/config/index.js
 * 
 * MVPAPP SOURCE: recording-app/src/services/firebase.js
 * UIAPP TARGET: src/config/firebase.js
 * CONVERSION: VITE_ → REACT_APP_ environment variables
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase Configuration with REACT_APP_ environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Validate Firebase configuration
const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN', 
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Initialization logging moved to AppLogger for admin control
// AppLogger.service('Firebase', '🔥 Firebase initialized for Love Retold project', { projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID });

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

/**
 * Initialize anonymous authentication for recording sessions with retry logic
 * Maintains exact same interface as MVPAPP but with UIAPP error handling patterns
 * 
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<User>} Firebase user object
 */
export const initializeAnonymousAuth = async (maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check if already authenticated with anonymous auth
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        console.log('Anonymous authentication already active');
        return auth.currentUser;
      }
      
      // Sign out any existing user before anonymous auth
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        await auth.signOut();
        console.log('Signed out existing user for anonymous auth');
      }
      
      // Initialize anonymous authentication
      const userCredential = await signInAnonymously(auth);
      console.log(`Anonymous authentication initialized (attempt ${attempt})`);
      
      // Validate the authentication state
      if (!userCredential.user || !userCredential.user.isAnonymous) {
        throw new Error('Anonymous authentication failed - invalid auth state');
      }
      
      return userCredential.user;
    } catch (error) {
      lastError = error;
      console.error(`Anonymous auth attempt ${attempt} failed:`, error);
      
      // Don't retry on certain permanent errors
      if (error.code === 'auth/network-request-failed' && attempt < maxRetries) {
        console.log(`Retrying authentication in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      } else if (error.code && error.code.startsWith('auth/')) {
        // Firebase auth error - provide specific message
        throw new Error(`Authentication failed: ${error.message}`);
      } else {
        // Unknown error on last attempt
        if (attempt === maxRetries) {
          throw new Error(`Authentication failed after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }
  }
  
  throw new Error(`Authentication failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
};

export default app;