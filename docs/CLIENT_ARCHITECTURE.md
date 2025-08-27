# Love Retold Recording Client Architecture

**Version**: 2.1 - Verified Implementation  
**Last Updated**: January 27, 2025  
**Architecture**: React Web Client with Firebase Integration  

## Executive Summary

The Love Retold Recording Client is a sophisticated React-based web application that enables anonymous users to record audio/video memories through secure session-based workflows. The client integrates with the Master Love Retold API for session management while implementing local Cloud Functions for processing and atomic data operations.

**Key Capabilities**:
- **Dual Validation System**: Master API + Local validation for robust session verification
- **Anonymous Recording**: Secure recording without user authentication requirements  
- **Atomic Upload Operations**: Transaction-based completion with automatic cleanup
- **Real-time Progress Tracking**: Live upload progress with Firestore field updates
- **Comprehensive Error Recovery**: Intelligent retry logic with storage cleanup

---

## Quick Start Guide

### Prerequisites
```bash
Node.js 18+ 
Firebase CLI 13+
React 18+
```

### Development Setup
```bash
# Clone and install
git clone [repository-url]
cd LoveRetoldRecorder
npm install

# Start Firebase emulators
firebase emulators:start

# Start development server  
npm start
```

### Session URL Format
```
https://record.loveretold.com/{sessionId}
```

Where `sessionId` follows Master API format: `{random}-{promptId}-{userId}-{storytellerId}-{timestamp}`

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    LOVE RETOLD ECOSYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│  Master API (love-retold-webapp)                          │
│  ├── getRecordingSession (validation)                      │
│  ├── createRecordingSession (session management)          │
│  └── Firestore Database (shared)                          │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│              RECORDING CLIENT (This Codebase)              │
├─────────────────────────────────────────────────────────────┤
│  React App (packages/web-app/src/)                        │
│  ├── SessionValidator (dual validation)                   │
│  ├── useRecordingFlow (state management)                  │
│  ├── submissionHandlers (upload orchestration)           │
│  └── Components (UI layer)                                │
│                                                            │
│  Local Cloud Functions (packages/cloud-functions/)        │
│  ├── validateSession (local validation)                   │
│  ├── processRecording (storage trigger)                   │
│  └── createStory (manual testing)                         │
│                                                            │
│  Firebase Services                                         │
│  ├── Firestore (recordingSessions collection)            │
│  ├── Storage (user recordings)                            │
│  └── Auth (anonymous authentication)                      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React 18, Modern Hooks | User interface and state management |
| **State Management** | useReducer + Context | Centralized app state with actions |
| **Authentication** | Firebase Auth (Anonymous) | Secure anonymous recording sessions |
| **Database** | Cloud Firestore | Real-time session data and progress tracking |
| **Storage** | Firebase Storage | Audio/video file storage with metadata |
| **Functions** | Firebase Functions v2 | Local processing and atomic operations |
| **Build System** | Create React App + Firebase | Modern build pipeline with deployment |

---

## Complete Dataflow Reference

### Phase 0: Dual Session Validation

The client implements a robust dual validation system that verifies sessions through both the Master API and local validation.

```typescript
// File: packages/web-app/src/services/firebase/functions.js:30
const masterValidation = await httpsCallable(functions, 'getRecordingSession')({
  sessionId: sessionId
});

// Response format from Master API:
interface MasterValidationResponse {
  status: 'valid' | 'removed' | 'expired' | 'completed';
  message: string;
  session?: {
    promptText: string;
    storytellerName: string;
    askerName: string;
    maxDuration: number;
    allowAudio: boolean;
    allowVideo: boolean;
  };
}
```

```typescript
// File: packages/cloud-functions/src/sessions/validateSession.ts:39
const localValidation = await httpsCallable(functions, 'validateSession')({
  sessionId: sessionId  
});

// Response format from Local API:
interface LocalValidationResponse {
  isValid: boolean;
  status: 'active' | 'pending' | 'expired' | 'completed' | 'removed' | 'invalid';
  message: string;
  sessionData?: {
    questionText: string;
    storytellerName: string;
    askerName: string;
    createdAt: Timestamp;
    expiresAt: Timestamp;
  };
}
```

**Validation Matrix**:

| Master Status | Local Status | Result | Action |
|---------------|-------------|---------|--------|
| `valid` | `active` | ✅ **Allow Recording** | Proceed to recording interface |
| `valid` | `pending` | ✅ **Allow Recording** | Show pending state, allow recording |
| `expired` | `expired` | ❌ **Block** | Show "Link expired" message |
| `completed` | `completed` | ❌ **Block** | Show "Already recorded" message |
| `removed` | `removed` | ❌ **Block** | Show "Question deleted" message |

### Phase 1: Recording Initiation

```typescript
// File: packages/web-app/src/hooks/useRecordingFlow.js:85
// Triggered: User starts recording after 3-2-1 countdown

const startRecording = async () => {
  // Initialize MediaRecorder with optimal codec
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: getBestSupportedMimeType(captureMode) // 'audio/mp4;codecs=mp4a.40.2' preferred
  });
  
  // Start recording timer (30 second limit)
  setIsRecording(true);
  setElapsedSeconds(0);
  
  // No Firestore update during recording start - optimized for performance
};
```

### Phase 2: Upload Orchestration

```typescript
// File: packages/web-app/src/utils/submissionHandlers.js:183-196
// Triggered: User clicks "Done", recording stops

const handleSubmit = async () => {
  // Convert object URL to Blob
  const response = await fetch(recordedBlobUrl);
  const recordedBlob = await response.blob();
  
  // Generate timestamped filename
  const fileName = `${year}-${month}-${day}_${hours}${mins}${secs}_${captureMode}.${fileExtension}`;
  
  // Route to Love Retold upload service
  if (sessionId && sessionComponents && sessionComponents.userId) {
    const uploadResult = await uploadLoveRetoldRecording(
      recordedBlob,
      sessionId,
      sessionComponents,
      sessionData,
      {
        mediaType: captureMode,           // 'audio' or 'video'
        actualMimeType: actualMimeType,   // Browser-selected codec
        onProgress: (progress) => {       // Real-time progress callback
          dispatch({ type: APP_ACTIONS.SET_UPLOAD_FRACTION, payload: progress / 100.0 });
        },
        maxRetries: 3
      }
    );
  }
};
```

### Phase 3: Atomic Upload with Storage Coordination

```typescript
// File: packages/web-app/src/services/firebase/loveRetoldUpload.js:183-223
// Step 3A: Pre-Upload Status Update

await updateDoc(doc(db, 'recordingSessions', sessionId), {
  status: 'Uploading',                           // Master API status value
  'recordingData.fileSize': recordingBlob.size,  // File size in bytes
  'recordingData.mimeType': recordingBlob.type,  // Actual browser MIME type
  'recordingData.uploadStartedAt': new Date(),   // Upload initiation timestamp
  updatedAt: serverTimestamp()                   // Required for Firestore rules
});
```

```typescript
// File: packages/web-app/src/services/firebase/loveRetoldUpload.js:164-177
// Step 3B: Storage Upload with Metadata

// UID-FIX-SLICE-A: Use full userId from session data
const fullUserId = sessionData?.fullUserId || sessionComponents.userId;
const finalPath = `users/${fullUserId}/recordings/${sessionId}/final/recording.${fileExtension}`;

const metadata = {
  contentType: actualMimeType,
  customMetadata: {
    sessionId: sessionId,
    userId: fullUserId,                           // Complete user ID (not truncated)
    promptId: sessionComponents.promptId,
    storytellerId: sessionComponents.storytellerId,
    recordingType: mediaType,                     // 'audio' or 'video'
    timestamp: Date.now().toString(),
    recordingVersion: '2.1-love-retold-status-fixed'
  }
};
```

```typescript
// File: packages/web-app/src/services/firebase/loveRetoldUpload.js:242-256
// Step 3C: Progress Updates (Every 10%)

uploadTask.on('state_changed', (snapshot) => {
  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
  
  if (Math.round(progress) % 10 === 0) {
    updateDoc(doc(db, 'recordingSessions', sessionId), {
      'recordingData.uploadProgress': Math.round(progress),  // 10, 20, 30... 100
      'recordingData.lastUpdated': new Date(),              // Progress timestamp
      updatedAt: serverTimestamp()
    });
  }
});
```

```typescript
// File: packages/web-app/src/services/firebase/transactions.js:41-83
// Step 3D: Atomic Completion Transaction

await runTransaction(db, async (transaction) => {
  const sessionDoc = await transaction.get(sessionRef);
  
  // Validation: Ensure session exists and is in valid state
  if (!sessionDoc.exists()) {
    throw createError(UPLOAD_ERRORS.RECORDING_NOT_FOUND, `Recording session ${sessionId} not found`);
  }
  
  const currentData = sessionDoc.data();
  
  // Idempotent completion check
  if (currentData.status === 'ReadyForTranscription') {
    return { success: true };
  }
  
  // State validation  
  if (!['Recording', 'Uploading'].includes(currentData.status)) {
    throw createError(UPLOAD_ERRORS.INVALID_STATE, `Invalid session state: ${currentData.status}`);
  }
  
  // Atomic update - ALL fields updated together
  transaction.update(sessionRef, {
    status: 'ReadyForTranscription',              // Final success status
    'storagePaths.finalVideo': uploadedFilePath,  // ACTUAL FIELD NAME (not recordingData.storagePath)
    'recordingData.uploadProgress': 100,          // Complete progress
    'recordingData.fileSize': completionData.fileSize,
    'recordingData.mimeType': completionData.mimeType,
    recordingCompletedAt: new Date(),             // Completion timestamp
    error: null,                                  // Clear any previous errors
    updatedAt: serverTimestamp()
  });
});
```

### Phase 4: Error Handling & Storage Cleanup

```typescript
// File: packages/web-app/src/services/firebase/transactions.js:97-106
// Automatic cleanup on transaction failure

if (shouldCleanupStorage && uploadedFilePath) {
  try {
    await cleanupUploadedFile(uploadedFilePath);
    console.log(`🧹 Cleaned up uploaded file: ${uploadedFilePath}`);
  } catch (cleanupError) {
    console.error(`⚠️ Storage cleanup failed: ${cleanupError}`);
  }
}

// Mark session as failed with error details
await updateDoc(doc(db, 'recordingSessions', sessionId), {
  status: 'failed',
  error: {
    message: atomicError.message,
    timestamp: new Date()
  },
  updatedAt: serverTimestamp()
});
```

---

## Status Transitions & Field Mappings

### Complete Status Flow

```
Master API Validation: 'valid' | 'removed' | 'expired' | 'completed'
Local API Validation: 'active' | 'pending' | 'expired' | 'completed' | 'removed' | 'invalid'
                                      ↓
                           Recording Starts (no status change)
                                      ↓
                    'Uploading' (immediate transition on upload start)
                                      ↓
              Progress Updates: 0% → 10% → 20% → ... → 100%
                                      ↓
              'ReadyForTranscription' (atomic transaction success)

Error Branches:
  'Uploading' → 'failed' + automatic storage cleanup
  'ReadyForTranscription' → 'failed' (rare, validation failures)
```

### Firestore Field Structure

```typescript
// Collection: recordingSessions/{sessionId}
interface RecordingSession {
  // Core identification
  sessionId: string;                    // Full session ID from Master API
  userId: string;                       // Truncated user ID (session component)
  fullUserId: string;                   // Complete user ID from Firestore (UID-FIX-SLICE-A)
  promptId: string;
  storytellerId: string;
  
  // Status and timestamps
  status: 'active' | 'pending' | 'Recording' | 'Uploading' | 'ReadyForTranscription' | 'failed';
  createdAt: Timestamp;
  updatedAt: Timestamp;                 // Required by Firestore rules
  recordingStartedAt?: Date;
  recordingCompletedAt?: Date;
  
  // Recording data (dot notation updates)
  recordingData: {
    fileSize: number;                   // File size in bytes
    mimeType: string;                   // Browser-selected MIME type
    uploadStartedAt: Date;              // Upload initiation
    uploadCompletedAt?: Date;           // Upload completion
    uploadProgress: number;             // 0-100
    lastUpdated: Date;                  // Last progress update
  };
  
  // Storage paths (ACTUAL FIELD NAMES)
  storagePaths: {
    finalVideo: string;                 // users/{fullUserId}/recordings/{sessionId}/final/recording.{ext}
  };
  
  // Error tracking
  error?: {
    message: string;
    timestamp: Date;
  };
}
```

### Field Update Patterns

**Recording Start** (useRecordingFlow.js):
- No Firestore updates (performance optimization)
- Local state management only

**Upload Initiation** (loveRetoldUpload.js:183):
```typescript
{
  status: 'Uploading',                           // FROM: no status or 'active'
  'recordingData.fileSize': number,              // NEW: File size in bytes
  'recordingData.mimeType': string,              // NEW: Browser MIME type
  'recordingData.uploadStartedAt': Date,         // NEW: Upload start timestamp
  updatedAt: serverTimestamp()
}
```

**Progress Updates** (loveRetoldUpload.js:243 - every 10%):
```typescript
{
  'recordingData.uploadProgress': number,        // PROGRESSIVE: 10, 20, 30... 100
  'recordingData.lastUpdated': Date,             // UPDATED: Progress timestamp
  updatedAt: serverTimestamp()
}
```

**Atomic Completion** (transactions.js:70-80):
```typescript
{
  status: 'ReadyForTranscription',               // FROM: 'Uploading'
  'storagePaths.finalVideo': string,             // NEW: Storage path (ACTUAL FIELD NAME)
  'recordingData.uploadProgress': 100,           // FINAL: Complete
  'recordingData.uploadCompletedAt': Date,       // NEW: Completion timestamp
  recordingCompletedAt: Date,                    // NEW: Session completion
  error: null,                                   // CLEAR: Remove any previous errors
  updatedAt: serverTimestamp()
}
```

**Error State** (loveRetoldUpload.js:389):
```typescript
{
  status: 'failed',                              // FROM: 'Uploading'
  error: {
    message: string,                             // Human-readable error
    timestamp: Date                              // Error occurrence time
  },
  updatedAt: serverTimestamp()
}
```

---

## Implementation Guides

### Adding New Recording Features

#### 1. Extend Recording Flow Hook

```typescript
// File: packages/web-app/src/hooks/useRecordingFlow.js

// Add new state
const [newFeature, setNewFeature] = useState(false);

// Extend recording logic
const startRecording = useCallback(async () => {
  // ... existing logic ...
  
  // Add new feature logic
  if (newFeature) {
    // Implement feature-specific behavior
  }
}, [newFeature, /* other dependencies */]);

// Export new state
return {
  // ... existing returns ...
  newFeature,
  setNewFeature
};
```

#### 2. Update Submission Handler

```typescript
// File: packages/web-app/src/utils/submissionHandlers.js

// Extend upload options
const uploadResult = await uploadLoveRetoldRecording(
  recordedBlob,
  sessionId,
  sessionComponents,
  sessionData,
  {
    // ... existing options ...
    newFeatureData: newFeatureData,  // Add new feature data
    customMetadata: {
      // Add metadata for new feature
      featureEnabled: true,
      featureVersion: '1.0'
    }
  }
);
```

#### 3. Modify Firestore Schema

```typescript
// Update interface in type definitions
interface RecordingSession {
  // ... existing fields ...
  
  // New feature fields
  featureData?: {
    enabled: boolean;
    value: any;
    timestamp: Date;
  };
}

// Update field paths for dot notation
'featureData.enabled': boolean,
'featureData.value': any,
'featureData.timestamp': Date
```

### Implementing Custom Validation

```typescript
// File: packages/cloud-functions/src/sessions/customValidator.ts

import { httpsCallable } from 'firebase-functions/v2/https';

interface CustomValidationRequest {
  sessionId: string;
  customCriteria: {
    requiresFeature?: boolean;
    minimumDuration?: number;
    userRole?: string;
  };
}

export const customValidateSession = httpsCallable(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const { data } = request;
    
    // Get base session validation
    const baseValidation = await validateSession({ sessionId: data.sessionId });
    
    if (!baseValidation.isValid) {
      return baseValidation;
    }
    
    // Apply custom validation logic
    const customChecks = await performCustomValidation(data);
    
    return {
      isValid: customChecks.passed,
      status: customChecks.passed ? 'valid' : 'rejected',
      message: customChecks.message,
      customValidation: customChecks
    };
  }
);
```

### Error Recovery Patterns

```typescript
// File: packages/web-app/src/utils/errorRecovery.js

export const handleUploadFailure = async (error, sessionId, retryCount = 0) => {
  const maxRetries = 3;
  
  // Classify error type
  if (error.code === 'storage/unauthorized') {
    // Refresh authentication and retry
    await refreshAnonymousAuth();
    
    if (retryCount < maxRetries) {
      return await retryUpload(sessionId, retryCount + 1);
    }
  } else if (error.code === 'firestore/permission-denied') {
    // Session may have expired, validate again
    const revalidation = await validateSession(sessionId);
    
    if (!revalidation.isValid) {
      throw new Error('Session expired during upload');
    }
  } else if (error.message.includes('network')) {
    // Network error, exponential backoff
    const delay = Math.pow(2, retryCount) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (retryCount < maxRetries) {
      return await retryUpload(sessionId, retryCount + 1);
    }
  }
  
  throw error; // Re-throw if not recoverable
};
```

---

## Performance Optimization

### Firebase Best Practices Implementation

#### 1. Connection Pooling & Client Reuse

```typescript
// File: packages/web-app/src/config/firebase.js

// Initialize Firebase app once
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  // ... config
};

// Single app instance (connection pooling)
export const app = initializeApp(firebaseConfig);

// Reuse service instances
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

#### 2. Efficient Listener Management

```typescript
// File: packages/web-app/src/hooks/useSessionListener.js

import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const useSessionListener = (sessionId) => {
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!sessionId) return;
    
    // Long-lived listener (Firebase best practice)
    const unsubscribe = onSnapshot(
      doc(db, 'recordingSessions', sessionId),
      (doc) => {
        if (doc.exists()) {
          setSessionData(doc.data());
        }
        setLoading(false);
      },
      (error) => {
        console.error('Session listener error:', error);
        setLoading(false);
      }
    );
    
    // Cleanup on unmount
    return unsubscribe;
  }, [sessionId]);
  
  return { sessionData, loading };
};
```

#### 3. Write Rate Management (500/50/5 Rule)

```typescript
// File: packages/web-app/src/utils/writeRateLimiter.js

class WriteRateLimiter {
  constructor() {
    this.writeQueue = [];
    this.isProcessing = false;
    this.writeCount = 0;
    this.intervalStart = Date.now();
  }
  
  async queueWrite(writeOperation) {
    return new Promise((resolve, reject) => {
      this.writeQueue.push({ writeOperation, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (this.writeQueue.length > 0) {
      // Implement 500/50/5 rule: max 500 writes/sec, increase by 50% every 5 min
      const now = Date.now();
      const timeWindow = 1000; // 1 second
      const maxWrites = this.calculateMaxWrites();
      
      if (this.writeCount >= maxWrites) {
        // Wait for next time window
        await new Promise(resolve => setTimeout(resolve, timeWindow));
        this.writeCount = 0;
        this.intervalStart = now;
      }
      
      const { writeOperation, resolve, reject } = this.writeQueue.shift();
      
      try {
        const result = await writeOperation();
        this.writeCount++;
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    
    this.isProcessing = false;
  }
  
  calculateMaxWrites() {
    const elapsed = Date.now() - this.intervalStart;
    const fiveMinutes = 5 * 60 * 1000;
    const intervals = Math.floor(elapsed / fiveMinutes);
    
    // Start at 500, increase by 50% every 5 minutes
    return Math.floor(500 * Math.pow(1.5, intervals));
  }
}

export const writeRateLimiter = new WriteRateLimiter();
```

#### 4. Optimized Firestore Updates

```typescript
// File: packages/web-app/src/services/firebase/optimizedFirestore.js

import { doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Batch related updates together
export const batchUpdateSession = async (sessionId, updates) => {
  const batch = writeBatch(db);
  const sessionRef = doc(db, 'recordingSessions', sessionId);
  
  // Add serverTimestamp to all updates
  const timestampedUpdates = {
    ...updates,
    updatedAt: serverTimestamp()
  };
  
  batch.update(sessionRef, timestampedUpdates);
  
  // Execute atomic batch
  await batch.commit();
};

// Efficient progress updates with throttling
export const throttledProgressUpdate = (() => {
  let lastUpdate = 0;
  const throttleMs = 1000; // Max 1 update per second
  
  return async (sessionId, progress) => {
    const now = Date.now();
    
    if (now - lastUpdate < throttleMs && progress < 100) {
      return; // Skip intermediate updates
    }
    
    lastUpdate = now;
    
    await updateDoc(doc(db, 'recordingSessions', sessionId), {
      'recordingData.uploadProgress': progress,
      'recordingData.lastUpdated': new Date(),
      updatedAt: serverTimestamp()
    });
  };
})();
```

### Bundle Size Optimization

```typescript
// File: packages/web-app/src/services/firebase/lazyFirebase.js

// Lazy load Firebase services to reduce initial bundle size
export const getLazyFirestore = async () => {
  const { getFirestore } = await import('firebase/firestore');
  return getFirestore();
};

export const getLazyStorage = async () => {
  const { getStorage } = await import('firebase/storage');
  return getStorage();
};

export const getLazyFunctions = async () => {
  const { getFunctions } = await import('firebase/functions');
  return getFunctions();
};
```

---

## Security Implementation

### Firestore Security Rules

```javascript
// File: firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Recording sessions - Enhanced anonymous access patterns
    match /recordingSessions/{sessionId} {
      // Anonymous read access for session validation
      allow read: if true;
      
      // Anonymous write access during active recording
      allow update: if request.auth != null 
        && request.auth.token.firebase.sign_in_provider == 'anonymous'
        && resource.data.status in ['ReadyForRecording', 'Recording', 'Uploading', 'failed']
        && request.resource.data.status in ['Recording', 'Uploading', 'ReadyForTranscription', 'failed']
        && request.resource.data.userId == resource.data.userId
        && request.resource.data.promptId == resource.data.promptId
        && request.resource.data.storytellerId == resource.data.storytellerId
        && onlyAllowedFields([
          'status', 'recordingData', 'storagePaths',
          'recordingStartedAt', 'recordingCompletedAt', 'error', 'updatedAt'
        ]);
      
      // Master Love Retold app access
      allow create, delete: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
    }
    
    // Helper function for field validation
    function onlyAllowedFields(allowedFields) {
      return request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(allowedFields);
    }
  }
}
```

### Storage Security Rules

```javascript
// File: storage.rules

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Recording uploads - Anonymous access with session validation
    match /users/{userId}/recordings/{sessionId}/{allPaths=**} {
      allow write: if request.auth != null
        && request.auth.token.firebase.sign_in_provider == 'anonymous'
        && isValidRecordingSession(sessionId, userId);
        
      allow read: if request.auth != null
        && (request.auth.uid == userId || isAuthorizedViewer(sessionId));
    }
    
    // Session validation function
    function isValidRecordingSession(sessionId, userId) {
      let sessionDoc = firestore.get(/databases/(default)/documents/recordingSessions/$(sessionId));
      return sessionDoc != null 
        && sessionDoc.data.status in ['active', 'Recording', 'Uploading']
        && (sessionDoc.data.userId == userId || sessionDoc.data.fullUserId == userId);
    }
    
    function isAuthorizedViewer(sessionId) {
      let sessionDoc = firestore.get(/databases/(default)/documents/recordingSessions/$(sessionId));
      return sessionDoc != null 
        && sessionDoc.data.status == 'ReadyForTranscription';
    }
  }
}
```

### Anonymous Authentication Management

```typescript
// File: packages/web-app/src/services/firebase/anonymousAuth.js

import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../config/firebase';

class AnonymousAuthManager {
  constructor() {
    this.authState = null;
    this.listeners = new Set();
    this.initializeAuth();
  }
  
  async initializeAuth() {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, 
        (user) => {
          this.authState = user;
          this.notifyListeners(user);
          unsubscribe();
          resolve(user);
        },
        (error) => {
          console.error('Auth state error:', error);
          unsubscribe();
          reject(error);
        }
      );
    });
  }
  
  async ensureAnonymousAuth() {
    if (!this.authState) {
      try {
        const result = await signInAnonymously(auth);
        this.authState = result.user;
        console.log('Anonymous auth successful:', result.user.uid);
        return result.user;
      } catch (error) {
        console.error('Anonymous auth failed:', error);
        throw new Error(`Authentication failed: ${error.message}`);
      }
    }
    
    return this.authState;
  }
  
  async refreshAuth() {
    // Force re-authentication if token is close to expiry
    try {
      const token = await this.authState.getIdToken(true);
      console.log('Token refreshed successfully');
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Re-authenticate
      this.authState = null;
      return await this.ensureAnonymousAuth();
    }
  }
  
  onAuthStateChanged(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }
  
  notifyListeners(user) {
    this.listeners.forEach(callback => callback(user));
  }
  
  getAuthState() {
    return this.authState;
  }
}

export const anonymousAuthManager = new AnonymousAuthManager();
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. Session Validation Failures

**Problem**: "This recording link is invalid or no longer exists"

**Diagnosis Steps**:
```typescript
// Check session ID format
const sessionIdPattern = /^[a-zA-Z0-9]+-[a-zA-Z0-9]+-[a-zA-Z0-9]+-[a-zA-Z0-9]+-\d+$/;
console.log('Valid session ID format:', sessionIdPattern.test(sessionId));

// Test Master API validation
const masterResult = await httpsCallable(functions, 'getRecordingSession')({ sessionId });
console.log('Master API result:', masterResult.data);

// Test local validation
const localResult = await httpsCallable(functions, 'validateSession')({ sessionId });
console.log('Local validation result:', localResult.data);
```

**Common Causes & Solutions**:
- **Invalid session ID format** → Verify session ID follows Master API pattern
- **Expired session** → Check `expiresAt` timestamp (365 days from creation)
- **Session deleted** → Master API returns `status: 'removed'`
- **Network connectivity** → Test with Firebase emulators

#### 2. Upload Failures

**Problem**: Upload fails with storage or transaction errors

**Diagnosis Steps**:
```typescript
// Check authentication state
console.log('Auth state:', auth.currentUser);
console.log('Is anonymous:', auth.currentUser?.isAnonymous);

// Verify storage permissions
const storageRef = ref(storage, `users/${fullUserId}/recordings/${sessionId}/test.txt`);
try {
  await uploadBytes(storageRef, new Blob(['test']));
  console.log('Storage permissions OK');
} catch (error) {
  console.error('Storage permission error:', error);
}

// Check Firestore rules
try {
  await updateDoc(doc(db, 'recordingSessions', sessionId), {
    status: 'Uploading',
    updatedAt: serverTimestamp()
  });
  console.log('Firestore permissions OK');
} catch (error) {
  console.error('Firestore permission error:', error);
}
```

**Common Causes & Solutions**:
- **Storage permission denied** → Verify anonymous auth is active and session is valid
- **Firestore rules violation** → Check status transitions and field restrictions
- **Network timeout** → Implement exponential backoff retry logic
- **Atomic transaction failure** → Verify file was cleaned up automatically

#### 3. Progress Updates Not Working

**Problem**: Upload progress stays at 0% or doesn't update

**Diagnosis Steps**:
```typescript
// Monitor upload progress events
uploadTask.on('state_changed',
  (snapshot) => {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    console.log('Upload progress:', progress, 'bytes:', snapshot.bytesTransferred, '/', snapshot.totalBytes);
    
    // Check if updates are being triggered
    if (Math.round(progress) % 10 === 0) {
      console.log('Triggering Firestore update for:', Math.round(progress), '%');
    }
  },
  (error) => {
    console.error('Upload error:', error);
  },
  () => {
    console.log('Upload complete');
  }
);
```

**Common Causes & Solutions**:
- **Large file size** → Check browser memory limits and file size restrictions
- **MIME type issues** → Verify browser codec support with `MediaRecorder.isTypeSupported()`
- **Firestore update throttling** → Check write rate limiting (10% intervals)
- **Network interruption** → Implement pause/resume logic

#### 4. Status Transition Errors

**Problem**: Session stuck in 'Uploading' status

**Diagnosis Steps**:
```typescript
// Check current session state
const sessionDoc = await getDoc(doc(db, 'recordingSessions', sessionId));
const data = sessionDoc.data();

console.log('Current session state:', {
  status: data.status,
  uploadProgress: data.recordingData?.uploadProgress,
  hasStoragePath: !!data.storagePaths?.finalVideo,
  hasError: !!data.error,
  lastUpdated: data.updatedAt?.toDate()
});

// Verify storage file exists
if (data.storagePaths?.finalVideo) {
  const fileRef = ref(storage, data.storagePaths.finalVideo);
  try {
    const metadata = await getMetadata(fileRef);
    console.log('File exists:', metadata.size, 'bytes');
  } catch (error) {
    console.error('File not found:', error);
  }
}
```

**Common Causes & Solutions**:
- **Atomic transaction failed** → Check Cloud Function logs for transaction errors
- **Storage cleanup not triggered** → Manually clean up orphaned files
- **Race condition** → Implement proper transaction conflict handling
- **Session timeout** → Check if session expired during upload

### Debug Tools & Utilities

#### Upload Debug Logger

```typescript
// File: packages/web-app/src/utils/uploadDebugger.js

export class UploadDebugger {
  constructor() {
    this.logs = [];
    this.startTime = Date.now();
  }
  
  log(step, data, level = 'info') {
    const timestamp = Date.now() - this.startTime;
    const entry = {
      timestamp,
      step,
      data,
      level,
      time: new Date().toISOString()
    };
    
    this.logs.push(entry);
    console.log(`[${level.toUpperCase()}] ${step}:`, data);
  }
  
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
  
  downloadLogs(sessionId) {
    const logs = this.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `upload-debug-${sessionId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Usage throughout upload process
const debugger = new UploadDebugger();
debugger.log('Upload Started', { sessionId, fileSize: recordedBlob.size });
debugger.log('Progress Update', { progress: 50 });
debugger.log('Upload Complete', { storagePath: finalPath });
```

#### Network Diagnostic Tool

```typescript
// File: packages/web-app/src/utils/networkDiagnostic.js

export const diagnoseNetworkIssues = async () => {
  const results = {
    firebase: {},
    network: {},
    browser: {}
  };
  
  // Test Firebase connectivity
  try {
    await httpsCallable(functions, 'validateSession')({ sessionId: 'test' });
    results.firebase.functions = 'connected';
  } catch (error) {
    results.firebase.functions = error.code || 'error';
  }
  
  try {
    await getDoc(doc(db, 'test', 'test'));
    results.firebase.firestore = 'connected';
  } catch (error) {
    results.firebase.firestore = error.code || 'error';
  }
  
  // Test network speed
  const startTime = performance.now();
  try {
    await fetch('https://httpbin.org/bytes/1024'); // 1KB test
    const endTime = performance.now();
    results.network.speed = Math.round(1024 / (endTime - startTime) * 1000); // bytes/sec
  } catch (error) {
    results.network.speed = 'error';
  }
  
  // Browser capabilities
  results.browser.mediaRecorder = typeof MediaRecorder !== 'undefined';
  results.browser.webRTC = typeof navigator.mediaDevices !== 'undefined';
  results.browser.storage = typeof navigator.storage !== 'undefined';
  
  return results;
};
```

---

## Developer Onboarding

### Prerequisites Knowledge

**Required Skills**:
- React 18+ (Hooks, Context, useReducer)
- Firebase v9+ (Modular SDK)
- TypeScript (interfaces, async/await)
- Modern JavaScript (ES6+, modules)

**Firebase Services Understanding**:
- Cloud Firestore (documents, collections, security rules)
- Firebase Storage (upload, metadata, security rules)
- Firebase Functions (HTTP callable, storage triggers)
- Firebase Auth (anonymous authentication)

### Development Environment Setup

```bash
# 1. Clone repository
git clone [repository-url]
cd LoveRetoldRecorder

# 2. Install dependencies
npm install

# 3. Firebase CLI setup
npm install -g firebase-tools
firebase login
firebase use love-retold-webapp

# 4. Environment configuration
cp packages/web-app/.env.example packages/web-app/.env.local
# Edit .env.local with development settings

# 5. Start Firebase emulators
firebase emulators:start

# 6. Start development server (separate terminal)
cd packages/web-app
npm start
```

### Code Architecture Navigation

```
📁 Key Files to Understand:

🎯 Entry Points:
├── packages/web-app/src/App.js              # Main React application
├── packages/web-app/src/index.js            # React DOM root
└── packages/cloud-functions/src/index.ts    # Cloud Functions exports

🔄 Core Recording Flow:
├── src/hooks/useRecordingFlow.js             # Recording state management
├── src/utils/submissionHandlers.js          # Upload orchestration
├── src/services/firebase/loveRetoldUpload.js # Firebase upload service
└── src/services/firebase/transactions.js    # Atomic operations

🛠 Configuration & Utils:
├── src/config/index.js                      # App configuration constants
├── src/config/firebase.js                   # Firebase service initialization
├── src/utils/errors.js                      # Error classification system
└── src/utils/uploadDebugger.js              # Debug utilities

🔐 Security & Validation:
├── firestore.rules                          # Firestore security rules
├── storage.rules                            # Storage security rules
└── cloud-functions/src/sessions/validateSession.ts # Session validation
```

### Testing Strategy

```bash
# Unit tests
npm test

# Integration tests with emulators
firebase emulators:exec --only firestore,storage,functions "npm test"

# End-to-end testing
npm run test:e2e

# Performance testing
npm run test:performance
```

### Debugging Workflows

1. **Enable Debug Mode**:
   ```typescript
   localStorage.setItem('DEBUG_UPLOAD', 'true');
   ```

2. **Monitor Network Requests**:
   - Open browser DevTools
   - Network tab → Filter by "firebase"
   - Monitor Function calls and Firestore operations

3. **Firebase Emulator Logs**:
   ```bash
   firebase emulators:start --debug
   ```

4. **Cloud Function Debugging**:
   ```bash
   firebase functions:log --only validateSession
   ```

### Deployment Process

```bash
# 1. Build production version
npm run build

# 2. Deploy functions
firebase deploy --only functions

# 3. Deploy hosting
firebase deploy --only hosting

# 4. Deploy security rules
firebase deploy --only firestore:rules,storage
```

---

## API Reference

### Local Cloud Functions

#### `validateSession`

**Purpose**: Local session validation and business rule enforcement

```typescript
// HTTP Callable Function
const validateSession = httpsCallable(functions, 'validateSession');

// Request
interface ValidateSessionRequest {
  sessionId: string;
}

// Response  
interface ValidateSessionResponse {
  isValid: boolean;
  status: 'active' | 'pending' | 'expired' | 'completed' | 'removed' | 'invalid';
  message: string;
  sessionData?: {
    questionText: string;
    storytellerName: string;
    askerName: string;
    createdAt: Timestamp;
    expiresAt: Timestamp;
  };
}
```

**Business Rules Enforced**:
- **Rule A**: Already recorded sessions return `'completed'` status
- **Rule B**: Missing prompt text returns `'removed'` status  
- **Rule C**: Expired sessions (>365 days) return `'expired'` status
- **Rule D**: Non-existent sessions return `'invalid'` status

**Usage Example**:
```typescript
const result = await validateSession({ sessionId: 'abc123-prompt456-user789' });

if (result.data.isValid) {
  // Proceed with recording UI
  setSessionData(result.data.sessionData);
} else {
  // Show error message
  setErrorMessage(result.data.message);
}
```

#### `processRecording`

**Purpose**: Storage trigger for automated story creation

```typescript
// Storage Trigger Function
// Triggered on: gs://bucket/recordings/{sessionId}/{fileName}

// Automatic Processing:
// 1. Validates file path pattern
// 2. Extracts session metadata
// 3. Creates signed download URL (1 year expiry)
// 4. Creates story document in 'stories' collection
// 5. Updates session status to 'completed'
```

**Story Document Structure**:
```typescript
interface Story {
  id: string;                    // "story_{sessionId}_{timestamp}"
  sessionId: string;
  userId: string;
  questionText: string;
  recordingUrl: string;          // Signed URL
  recordingType: 'audio' | 'video';
  fileName: string;
  fileSize: number;
  transcript: string;            // Placeholder for future OpenAI integration
  metadata: {
    uploadedAt: Timestamp;
    processedAt: Timestamp;
    processingVersion: string;   // "1.0-epic15"
    contentType: string;
    duration: number | null;
  };
  status: 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `createStory`

**Purpose**: Manual story creation for testing

```typescript
// HTTP Callable Function (Testing Only)
const createStory = httpsCallable(functions, 'createStory');

// Request
interface CreateStoryRequest {
  sessionId: string;
  questionText: string;
  recordingUrl: string;
  userId: string;
}

// Response
interface CreateStoryResponse {
  success: boolean;
  storyId: string;
  message: string;
}
```

### Firebase Service Interfaces

#### Firestore Operations

```typescript
// Session Updates
await updateDoc(doc(db, 'recordingSessions', sessionId), {
  status: 'Uploading',
  'recordingData.fileSize': number,
  'recordingData.mimeType': string,
  updatedAt: serverTimestamp()
});

// Progress Updates  
await updateDoc(doc(db, 'recordingSessions', sessionId), {
  'recordingData.uploadProgress': number,        // 0-100
  'recordingData.lastUpdated': Date,
  updatedAt: serverTimestamp()
});

// Atomic Completion
await runTransaction(db, async (transaction) => {
  transaction.update(sessionRef, {
    status: 'ReadyForTranscription',
    'storagePaths.finalVideo': string,
    'recordingData.uploadProgress': 100,
    recordingCompletedAt: Date,
    error: null,
    updatedAt: serverTimestamp()
  });
});
```

#### Storage Operations

```typescript
// File Upload with Metadata
const metadata = {
  contentType: string,          // "audio/mp4;codecs=mp4a.40.2"
  customMetadata: {
    sessionId: string,
    userId: string,             // Full user ID
    promptId: string,
    storytellerId: string,
    recordingType: string,      // "audio" | "video"
    timestamp: string,          // Unix timestamp
    recordingVersion: string    // "2.1-love-retold-status-fixed"
  }
};

const uploadTask = uploadBytesResumable(storageRef, recordingBlob, metadata);

// Progress Monitoring
uploadTask.on('state_changed',
  (snapshot) => {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    onProgress(Math.round(progress));
  },
  (error) => {
    // Handle upload errors
  },
  () => {
    // Upload complete
  }
);
```

#### Authentication

```typescript
// Anonymous Authentication
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Initialize anonymous auth
const userCredential = await signInAnonymously(auth);
console.log('Anonymous user:', userCredential.user.uid);

// Monitor auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('User authenticated:', user.isAnonymous);
  }
});

// Check current auth state
const currentUser = auth.currentUser;
const isAuthenticated = currentUser && currentUser.isAnonymous;
```

---

## Advanced Topics

### Custom Upload Strategies

#### Resumable Upload Implementation

```typescript
// File: packages/web-app/src/services/firebase/resumableUpload.js

export class ResumableUploader {
  constructor(sessionId, recordingBlob, options = {}) {
    this.sessionId = sessionId;
    this.recordingBlob = recordingBlob;
    this.chunkSize = options.chunkSize || 256 * 1024; // 256KB chunks
    this.maxRetries = options.maxRetries || 5;
    this.uploadedBytes = 0;
    this.uploadId = null;
  }
  
  async startUpload() {
    // Initialize resumable upload session
    this.uploadId = await this.initializeUploadSession();
    
    const totalChunks = Math.ceil(this.recordingBlob.size / this.chunkSize);
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      await this.uploadChunk(chunkIndex);
      
      // Update progress
      const progress = ((chunkIndex + 1) / totalChunks) * 100;
      this.onProgress?.(progress);
    }
    
    return await this.finalizeUpload();
  }
  
  async uploadChunk(chunkIndex) {
    const start = chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.recordingBlob.size);
    const chunk = this.recordingBlob.slice(start, end);
    
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        await this.uploadChunkWithRetry(chunk, start, end - 1);
        this.uploadedBytes = end;
        break;
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          throw new Error(`Chunk upload failed after ${this.maxRetries} retries: ${error.message}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }
  }
}
```

#### Multi-Part Upload Strategy

```typescript
// File: packages/web-app/src/services/firebase/multipartUpload.js

export const uploadInParts = async (recordingBlob, sessionId, options = {}) => {
  const partSize = 5 * 1024 * 1024; // 5MB parts
  const totalParts = Math.ceil(recordingBlob.size / partSize);
  const uploadedParts = [];
  
  // Upload parts in parallel (max 3 concurrent)
  const concurrency = 3;
  const partPromises = [];
  
  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, recordingBlob.size);
    const partBlob = recordingBlob.slice(start, end);
    
    const partPromise = uploadPart(partBlob, sessionId, partNumber)
      .then(result => {
        uploadedParts[partNumber - 1] = result;
        
        // Update overall progress
        const completedParts = uploadedParts.filter(Boolean).length;
        const progress = (completedParts / totalParts) * 100;
        options.onProgress?.(progress);
        
        return result;
      });
    
    partPromises.push(partPromise);
    
    // Limit concurrency
    if (partPromises.length >= concurrency) {
      await Promise.race(partPromises.filter(p => p));
    }
  }
  
  // Wait for all parts to complete
  await Promise.all(partPromises);
  
  // Complete multipart upload
  return await completeMultipartUpload(sessionId, uploadedParts);
};
```

### Advanced Error Handling Patterns

#### Circuit Breaker Implementation

```typescript
// File: packages/web-app/src/utils/circuitBreaker.js

export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.monitoringPeriod = options.monitoringPeriod || 10000;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.nextAttempt = Date.now();
    this.successCount = 0;
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN. Operation blocked.');
      }
      
      // Transition to HALF_OPEN
      this.state = 'HALF_OPEN';
      this.successCount = 0;
    }
    
    try {
      const result = await operation();
      
      // Success handling
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= 3) {
          this.reset();
        }
      } else {
        this.failures = Math.max(0, this.failures - 1);
      }
      
      return result;
      
    } catch (error) {
      this.failures++;
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.resetTimeout;
      }
      
      throw error;
    }
  }
  
  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.nextAttempt = Date.now();
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.nextAttempt
    };
  }
}

// Usage
const uploadCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000 // 1 minute
});

export const safeUpload = async (uploadOperation) => {
  return await uploadCircuitBreaker.execute(uploadOperation);
};
```

#### Comprehensive Error Classification

```typescript
// File: packages/web-app/src/utils/errorClassification.js

export const ErrorTypes = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION', 
  PERMISSION: 'PERMISSION',
  STORAGE: 'STORAGE',
  VALIDATION: 'VALIDATION',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER: 'SERVER',
  CLIENT: 'CLIENT',
  UNKNOWN: 'UNKNOWN'
};

export const ErrorSeverity = {
  CRITICAL: 'CRITICAL',     // System unusable
  HIGH: 'HIGH',             // Major functionality broken
  MEDIUM: 'MEDIUM',         // Degraded experience
  LOW: 'LOW',               // Minor inconvenience
  INFO: 'INFO'              // Information only
};

export const classifyError = (error) => {
  const classification = {
    type: ErrorTypes.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    retryable: false,
    userMessage: 'An unexpected error occurred.',
    technicalMessage: error.message || 'Unknown error',
    suggestedAction: 'Please try again later.'
  };
  
  // Network errors
  if (error.code === 'network-error' || error.message?.includes('network')) {
    classification.type = ErrorTypes.NETWORK;
    classification.severity = ErrorSeverity.HIGH;
    classification.retryable = true;
    classification.userMessage = 'Network connection problem.';
    classification.suggestedAction = 'Check your internet connection and try again.';
  }
  
  // Authentication errors
  else if (error.code === 'unauthenticated' || error.code === 'auth/user-not-found') {
    classification.type = ErrorTypes.AUTHENTICATION;
    classification.severity = ErrorSeverity.CRITICAL;
    classification.retryable = false;
    classification.userMessage = 'Authentication failed.';
    classification.suggestedAction = 'Please refresh the page and try again.';
  }
  
  // Permission errors
  else if (error.code === 'permission-denied' || error.code === 'storage/unauthorized') {
    classification.type = ErrorTypes.PERMISSION;
    classification.severity = ErrorSeverity.HIGH;
    classification.retryable = false;
    classification.userMessage = 'Access denied.';
    classification.suggestedAction = 'This recording link may have expired or been removed.';
  }
  
  // Storage errors
  else if (error.code?.startsWith('storage/')) {
    classification.type = ErrorTypes.STORAGE;
    classification.severity = ErrorSeverity.HIGH;
    classification.retryable = true;
    
    if (error.code === 'storage/quota-exceeded') {
      classification.userMessage = 'Storage quota exceeded.';
      classification.suggestedAction = 'Please try again later or contact support.';
    } else if (error.code === 'storage/invalid-format') {
      classification.userMessage = 'Invalid file format.';
      classification.retryable = false;
      classification.suggestedAction = 'Please try recording again.';
    }
  }
  
  // Rate limiting
  else if (error.code === 'resource-exhausted' || error.message?.includes('rate limit')) {
    classification.type = ErrorTypes.RATE_LIMIT;
    classification.severity = ErrorSeverity.MEDIUM;
    classification.retryable = true;
    classification.userMessage = 'Too many requests.';
    classification.suggestedAction = 'Please wait a moment and try again.';
  }
  
  // Validation errors
  else if (error.code?.includes('invalid') || error.message?.includes('validation')) {
    classification.type = ErrorTypes.VALIDATION;
    classification.severity = ErrorSeverity.LOW;
    classification.retryable = false;
    classification.userMessage = 'Invalid request.';
    classification.suggestedAction = 'Please check your input and try again.';
  }
  
  return classification;
};
```

### Performance Monitoring & Analytics

#### Custom Performance Metrics

```typescript
// File: packages/web-app/src/utils/performanceMonitor.js

export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Set();
  }
  
  startTiming(operationName) {
    this.metrics.set(operationName, {
      startTime: performance.now(),
      endTime: null,
      duration: null,
      metadata: {}
    });
  }
  
  endTiming(operationName, metadata = {}) {
    const metric = this.metrics.get(operationName);
    if (!metric) {
      console.warn(`No timing started for operation: ${operationName}`);
      return null;
    }
    
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.metadata = { ...metric.metadata, ...metadata };
    
    this.notifyObservers(operationName, metric);
    return metric.duration;
  }
  
  recordCustomMetric(name, value, metadata = {}) {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    };
    
    this.metrics.set(`custom_${name}`, metric);
    this.notifyObservers(`custom_${name}`, metric);
  }
  
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
  
  onMetric(callback) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }
  
  notifyObservers(name, metric) {
    this.observers.forEach(callback => {
      try {
        callback(name, metric);
      } catch (error) {
        console.error('Performance observer error:', error);
      }
    });
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Usage throughout application
performanceMonitor.startTiming('session_validation');
const result = await validateSession(sessionId);
performanceMonitor.endTiming('session_validation', { 
  success: result.isValid,
  sessionId 
});

performanceMonitor.recordCustomMetric('upload_file_size', recordingBlob.size, {
  mediaType: captureMode,
  codec: actualMimeType
});
```

#### Real-time Analytics Integration

```typescript
// File: packages/web-app/src/services/analytics.js

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export class AnalyticsService {
  constructor() {
    this.sessionId = null;
    this.events = [];
    this.batchSize = 10;
  }
  
  initialize(sessionId) {
    this.sessionId = sessionId;
    this.startTime = Date.now();
  }
  
  trackEvent(eventName, properties = {}) {
    const event = {
      name: eventName,
      timestamp: Date.now(),
      sessionTime: Date.now() - this.startTime,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };
    
    this.events.push(event);
    
    // Auto-flush if batch size reached
    if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }
  
  async flush() {
    if (this.events.length === 0) return;
    
    const eventsToSend = [...this.events];
    this.events = [];
    
    try {
      // Send to Firestore analytics collection
      await setDoc(doc(db, 'analytics', `${this.sessionId}_${Date.now()}`), {
        sessionId: this.sessionId,
        events: eventsToSend,
        createdAt: serverTimestamp(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        }
      });
    } catch (error) {
      console.error('Analytics flush failed:', error);
      // Re-add events to queue for retry
      this.events.unshift(...eventsToSend);
    }
  }
  
  // Pre-defined event tracking methods
  trackSessionStart() {
    this.trackEvent('session_start');
  }
  
  trackRecordingStart(mediaType) {
    this.trackEvent('recording_start', { mediaType });
  }
  
  trackUploadStart(fileSize, mimeType) {
    this.trackEvent('upload_start', { fileSize, mimeType });
  }
  
  trackUploadComplete(duration, fileSize) {
    this.trackEvent('upload_complete', { 
      duration, 
      fileSize,
      uploadSpeed: fileSize / (duration / 1000) // bytes per second
    });
  }
  
  trackError(error, context = {}) {
    this.trackEvent('error', {
      errorMessage: error.message,
      errorCode: error.code,
      context
    });
  }
}

export const analytics = new AnalyticsService();
```

---

## Appendices

### Appendix A: Configuration Reference

#### Environment Variables

```bash
# packages/web-app/.env.local

# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=love-retold-webapp.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=love-retold-webapp
REACT_APP_FIREBASE_STORAGE_BUCKET=love-retold-webapp.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Development Settings
REACT_APP_USE_FIREBASE_EMULATOR=true
REACT_APP_DEBUG_MODE=true
REACT_APP_LOG_LEVEL=debug

# Recording Configuration
REACT_APP_MAX_RECORDING_DURATION=30
REACT_APP_SUPPORTED_AUDIO_CODECS=audio/mp4;codecs=mp4a.40.2,audio/webm;codecs=opus
REACT_APP_SUPPORTED_VIDEO_CODECS=video/mp4;codecs=h264,video/webm;codecs=vp8
```

#### Firebase Configuration Files

```json
// firebase.json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "functions": {
    "source": "packages/cloud-functions",
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"],
    "runtime": "nodejs18"
  },
  "hosting": [
    {
      "site": "record-loveretold-app",
      "public": "packages/web-app/build",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ],
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4001 }
  }
}
```

### Appendix B: Security Rules Reference

#### Complete Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAnonymousUser() {
      return request.auth != null && 
             request.auth.token.firebase.sign_in_provider == 'anonymous';
    }
    
    function onlyUpdatingFields(fields) {
      return request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(fields);
    }
    
    function isValidStatusTransition(oldStatus, newStatus) {
      let validTransitions = {
        'ReadyForRecording': ['Recording', 'Uploading', 'failed'],
        'Recording': ['Uploading', 'failed'],
        'Uploading': ['ReadyForTranscription', 'failed'],
        'ReadyForTranscription': ['Transcribed', 'failed'],
        'failed': ['ReadyForRecording']
      };
      
      return newStatus in validTransitions.get(oldStatus, []);
    }
    
    // Recording Sessions Collection
    match /recordingSessions/{sessionId} {
      // Anonymous read access for session validation
      allow read: if true;
      
      // Anonymous recording updates with comprehensive validation
      allow update: if isAnonymousUser()
        && resource.data.status in ['ReadyForRecording', 'Recording', 'Uploading', 'failed']
        && request.resource.data.status in ['Recording', 'Uploading', 'ReadyForTranscription', 'failed']
        && isValidStatusTransition(resource.data.status, request.resource.data.status)
        && request.resource.data.userId == resource.data.userId
        && request.resource.data.promptId == resource.data.promptId
        && request.resource.data.storytellerId == resource.data.storytellerId
        && onlyUpdatingFields([
          'status', 'recordingData', 'storagePaths',
          'recordingStartedAt', 'recordingCompletedAt', 'error', 'updatedAt'
        ]);
      
      // Master Love Retold app access
      allow create: if isAuthenticated() 
        && request.auth.uid == request.resource.data.userId;
      allow delete: if isAuthenticated() 
        && request.auth.uid == resource.data.userId;
      allow read, write: if isAuthenticated() 
        && request.auth.uid == resource.data.userId;
    }
    
    // Stories Collection
    match /stories/{storyId} {
      allow read, write: if isAuthenticated() 
        && request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() 
        && request.auth.uid == request.resource.data.userId;
    }
    
    // Analytics Collection (write-only for metrics)
    match /analytics/{document=**} {
      allow write: if isAuthenticated();
      allow read: if false; // Admin SDK only
    }
  }
}
```

#### Complete Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper functions
    function isValidSession(sessionId, userId) {
      let sessionPath = /databases/(default)/documents/recordingSessions/$(sessionId);
      let sessionDoc = firestore.get(sessionPath);
      
      return sessionDoc != null 
        && sessionDoc.data.status in ['active', 'Recording', 'Uploading']
        && (sessionDoc.data.userId == userId || sessionDoc.data.fullUserId == userId);
    }
    
    function isCompletedSession(sessionId) {
      let sessionPath = /databases/(default)/documents/recordingSessions/$(sessionId);
      let sessionDoc = firestore.get(sessionPath);
      
      return sessionDoc != null 
        && sessionDoc.data.status == 'ReadyForTranscription';
    }
    
    function isValidRecordingFile(fileName) {
      return fileName.matches('recording\\.(mp4|webm|m4a)$');
    }
    
    // User recordings with comprehensive validation
    match /users/{userId}/recordings/{sessionId}/{fileName} {
      // Anonymous upload during recording
      allow write: if request.auth != null
        && request.auth.token.firebase.sign_in_provider == 'anonymous'
        && isValidSession(sessionId, userId)
        && isValidRecordingFile(fileName)
        && request.resource.size <= 50 * 1024 * 1024 // 50MB limit
        && request.resource.contentType.matches('(audio|video)/(mp4|webm)');
      
      // Read access for completed recordings
      allow read: if request.auth != null
        && (request.auth.uid == userId || isCompletedSession(sessionId));
    }
    
    // Temporary upload chunks (for resumable uploads)
    match /users/{userId}/recordings/{sessionId}/chunks/{chunkId} {
      allow write: if request.auth != null
        && request.auth.token.firebase.sign_in_provider == 'anonymous'
        && isValidSession(sessionId, userId)
        && request.resource.size <= 10 * 1024 * 1024; // 10MB chunk limit
      
      allow delete: if request.auth != null; // Allow cleanup
    }
  }
}
```

### Appendix C: Testing Examples

#### Unit Test Examples

```typescript
// __tests__/hooks/useRecordingFlow.test.js

import { renderHook, act } from '@testing-library/react-hooks';
import useRecordingFlow from '../../src/hooks/useRecordingFlow';

describe('useRecordingFlow', () => {
  beforeEach(() => {
    // Mock MediaRecorder API
    global.MediaRecorder = jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      ondataavailable: null,
      onstop: null,
      state: 'inactive'
    }));
    
    global.MediaRecorder.isTypeSupported = jest.fn(() => true);
  });
  
  test('should initialize with default state', () => {
    const { result } = renderHook(() => 
      useRecordingFlow({ 
        sessionId: 'test-session',
        sessionData: {},
        sessionComponents: {},
        onDoneAndSubmitStage: jest.fn()
      })
    );
    
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.recordedBlobUrl).toBe(null);
  });
  
  test('should start recording successfully', async () => {
    const mockGetUserMedia = jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    });
    
    global.navigator.mediaDevices = {
      getUserMedia: mockGetUserMedia
    };
    
    const { result } = renderHook(() => 
      useRecordingFlow({
        sessionId: 'test-session',
        sessionData: {},
        sessionComponents: {},
        onDoneAndSubmitStage: jest.fn()
      })
    );
    
    await act(async () => {
      await result.current.handleRecordStart('audio');
    });
    
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(result.current.isRecording).toBe(true);
  });
});
```

#### Integration Test Examples

```typescript
// __tests__/integration/uploadFlow.test.js

import { uploadLoveRetoldRecording } from '../../src/services/firebase/loveRetoldUpload';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';

describe('Upload Flow Integration', () => {
  let testEnv: RulesTestEnvironment;
  
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'test-project',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
      },
      storage: {
        rules: readFileSync('storage.rules', 'utf8'),
      }
    });
  });
  
  afterAll(async () => {
    await testEnv.cleanup();
  });
  
  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
  });
  
  test('should complete full upload flow', async () => {
    // Setup test session
    const sessionId = 'test-session-123';
    const testBlob = new Blob(['test audio data'], { type: 'audio/mp4' });
    
    const sessionRef = testEnv.firestore().doc(`recordingSessions/${sessionId}`);
    await sessionRef.set({
      status: 'active',
      userId: 'test-user',
      promptId: 'test-prompt',
      storytellerId: 'test-storyteller'
    });
    
    // Mock authentication
    const authContext = testEnv.authenticatedContext('test-user');
    
    // Execute upload
    const result = await uploadLoveRetoldRecording(
      testBlob,
      sessionId,
      { userId: 'test-user', promptId: 'test-prompt' },
      { fullUserId: 'test-user-full' },
      {
        mediaType: 'audio',
        actualMimeType: 'audio/mp4',
        onProgress: jest.fn()
      }
    );
    
    // Verify result
    expect(result.success).toBe(true);
    
    // Verify Firestore updates
    const updatedSession = await sessionRef.get();
    expect(updatedSession.data().status).toBe('ReadyForTranscription');
    
    // Verify Storage file exists
    const storagePath = result.storagePath;
    const file = testEnv.storage().ref(storagePath);
    const metadata = await file.getMetadata();
    expect(metadata.size).toBeGreaterThan(0);
  });
});
```

---

## Conclusion

This comprehensive client architecture documentation provides a complete reference for developers working with the Love Retold Recording Client. The system implements sophisticated patterns including dual validation, atomic transactions, and comprehensive error recovery while maintaining excellent performance and user experience.

**Key Takeaways**:
- **Architecture Clarity**: Clear separation between Master API and client implementation
- **Data Integrity**: Atomic operations with automatic cleanup prevent orphaned files
- **Error Resilience**: Circuit breakers, retry logic, and graceful degradation
- **Performance Optimization**: Connection pooling, rate limiting, and efficient updates
- **Security First**: Anonymous authentication with comprehensive rule validation

For questions, issues, or contributions, refer to the repository's issue tracker and contribution guidelines.

**Document Revision**: This document is maintained alongside code changes. Version updates reflect architectural modifications and feature additions.