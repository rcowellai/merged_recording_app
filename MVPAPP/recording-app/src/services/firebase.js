import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Love Retold Firebase Configuration - Environment Variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate Firebase configuration
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

console.log('🔥 Firebase initialized for Love Retold project:', import.meta.env.VITE_FIREBASE_PROJECT_ID);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize anonymous authentication for recording sessions with retry logic
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