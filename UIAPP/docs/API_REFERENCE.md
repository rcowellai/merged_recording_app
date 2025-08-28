# Love Retold Master API Reference
**Recording Client Integration Guide**

**Version**: 2.2 - Recording Client Validated  
**Last Updated**: January 27, 2025  
**Integration Target**: UIAPP Recording Client  

---

## 🏗️ Architecture Overview

### Master-Client Architecture
The Love Retold Recording Platform operates as a **client application** that consumes the **Master Love Retold API**:

```
Master Love Retold Application
├── Cloud Functions (Master API) ──┐
├── Firestore Database ────────────┤
├── Firebase Storage ──────────────┤
└── Firebase Auth ─────────────────┤
                                   │
Recording Client (This Codebase):  │
├── Session Validation ←───────────┤
├── Recording Interface ←──────────┤
├── Upload Management ←────────────┤
└── Status Updates ←───────────────┘
```

### Key Integration Points
- **No Local Functions**: Recording client calls external Master API functions
- **Shared Resources**: Firestore database and Firebase Storage  
- **Anonymous Authentication**: Recording client uses anonymous Firebase auth
- **Status Synchronization**: Recording client updates session status in shared database

---

## 🔗 Core API Functions

### `getRecordingSession` 
**Purpose**: Session validation for recording client  
**Called From**: Recording app session validation  
**Authentication**: Firebase Auth required  

#### Request
```typescript
// Called via Firebase Functions SDK
const validateFn = httpsCallable(functions, 'getRecordingSession');
const result = await validateFn({ sessionId: string });
```

#### Response Scenarios

##### Valid Session
```typescript
{
  status: 'valid',
  session: {
    sessionId: string;
    promptText: string;          // Question to ask
    askerName: string;           // Question creator's first name
    storytellerName: string;     // Assigned storyteller's first name  
    coupleNames: string;         // "Sarah & John" format
    maxDuration: 900;            // 15 minutes in seconds
    allowAudio: true;            // Audio recording permitted
    allowVideo: true;            // Video recording permitted
  }
}
```

##### Session Not Found
```typescript
{
  status: 'removed',
  message: 'This question has been removed by the account owner'
}
```

##### Expired Session  
```typescript
{
  status: 'expired',
  message: 'This recording link has expired'  // 365-day expiration
}
```

##### Already Completed
```typescript
{
  status: 'completed', 
  message: 'This memory has been recorded'
}
```

#### Implementation Example
```javascript
// src/services/firebase/functions.js
export const validateRecordingSession = async (sessionId) => {
  try {
    const validateFn = httpsCallable(functions, 'getRecordingSession');
    const result = await validateFn({ sessionId });
    
    return {
      isValid: result.data.status === 'valid',
      sessionData: result.data.session,
      message: result.data.message
    };
  } catch (error) {
    console.error('Session validation failed:', error);
    throw error;
  }
};
```

---

### `createRecordingSession` 
**Purpose**: Create new recording session  
**Called From**: Love Retold main application (not recording client)  
**Authentication**: Firebase Auth required  

#### Request
```typescript  
{
  promptInstanceId: string;  // Prompt instance ID for atomic update
  promptId: string;          // Core prompt identifier
  userId: string;            // User ID (must match auth.uid)
  questionText: string;      // The question/prompt text
  storytellerId?: string;    // Optional storyteller assignment
}
```

#### Response
```typescript
{
  sessionId: string;         // Generated session ID
  uniqueUrl: string;         // Full recording URL
  expiresAt: string;         // ISO timestamp (365 days)
}
```

#### Session ID Format
`{random}-{promptId}-{userId}-{storytellerId}-{timestamp}`

Example: `abc1234-prompt123-user456-story456-1704067200`

---

## 📊 Database Integration

### Shared Firestore Collections

#### recordingSessions Collection
```typescript
interface RecordingSession {
  sessionId: string;
  userId: string;
  promptId: string;
  storytellerId: string;
  status: 'ReadyForRecording' | 'Recording' | 'Uploading' | 
          'ReadyForTranscription' | 'Transcribed' | 'failed' | 'expired';
  promptText: string;
  coupleNames: string;
  storytellerName: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  recordingData?: {
    duration: number;
    mimeType: string;
    fileSize: number;
    uploadProgress: number;
  };
  storagePaths?: {
    finalVideo: string;
    chunksFolder?: string;
  };
  error?: {
    message: string;
    timestamp: Timestamp;
  };
}
```

#### Recording Client Update Permissions
**Allowed Fields** (Anonymous Auth):
```typescript
// Status updates
status: 'Recording' | 'Uploading' | 'ReadyForTranscription' | 'failed'
recordingStartedAt: Timestamp
recordingCompletedAt: Timestamp  
error: ErrorObject

// Recording metadata
recordingData: {
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  uploadProgress: number;
}

// Storage paths
storagePaths: {
  finalVideo?: string;
  chunksFolder?: string;
}
```

**Forbidden Fields** (Anonymous Auth):
- `userId`, `promptId`, `storytellerId` (ownership fields)
- `sessionId`, `promptText`, `askerName`, `storytellerName` (core data)  
- `createdAt`, `expiresAt` (system timestamps)
- `transcription.*` (managed by Master API)

---

## 🚀 Upload Integration

### Storage Path Structure
```
users/{userId}/recordings/{sessionId}/
├── final/
│   └── recording.{mp4|webm|mov}    # Final recording (required)
└── chunks/                         # Optional chunked uploads
    ├── chunk-0.{ext}
    └── chunk-N.{ext}
```

### Upload Process Flow
```typescript
// 1. Start recording - update status
await updateDoc(doc(db, 'recordingSessions', sessionId), {
  status: 'Recording',
  recordingStartedAt: serverTimestamp()
});

// 2. During upload - progress updates  
await updateDoc(doc(db, 'recordingSessions', sessionId), {
  status: 'Uploading',
  'recordingData.uploadProgress': progressPercent
});

// 3. Complete upload - trigger transcription
await updateDoc(doc(db, 'recordingSessions', sessionId), {
  status: 'ReadyForTranscription',
  recordingCompletedAt: serverTimestamp(),
  'recordingData.duration': durationSeconds,
  'recordingData.fileSize': fileSizeBytes,
  'recordingData.mimeType': 'video/mp4',
  'storagePaths.finalVideo': `users/${userId}/recordings/${sessionId}/final/recording.mp4`
});
```

### Transcription Trigger Requirements
The Master Love Retold API processes recordings when:
1. **Status**: Session status becomes `'ReadyForTranscription'`
2. **File**: `storagePaths.finalVideo` contains valid storage path
3. **Upload**: File exists at specified storage path

### Automatic Processing Pipeline
```typescript
// Master API automatically:
// 1. Detects status change to 'ReadyForTranscription'  
// 2. Downloads file from storagePaths.finalVideo
// 3. Processes transcription via OpenAI Whisper
// 4. Creates story document
// 5. Updates status to 'Transcribed'
```

---

## 🛡️ Security & Authentication

### Anonymous Authentication Pattern
```javascript
// Recording client authentication
import { signInAnonymously } from 'firebase/auth';

export const initializeAnonymousAuth = async () => {
  if (auth.currentUser && auth.currentUser.isAnonymous) {
    return auth.currentUser; // Already authenticated
  }
  
  // Initialize anonymous authentication
  const userCredential = await signInAnonymously(auth);
  return userCredential.user;
};
```

### Firestore Security Rules (Relevant Excerpts)
```javascript
// Recording sessions - Anonymous can update limited fields
match /recordingSessions/{sessionId} {
  allow read: if true;  // Public read for recording app
  
  allow update: if request.auth != null 
    && request.auth.token.firebase.sign_in_provider == 'anonymous'
    && onlyUpdatingFields([
      'status', 'recordingData', 'storagePaths', 
      'recordingStartedAt', 'recordingCompletedAt', 'error'
    ]);
}
```

### Storage Security Rules (Relevant Excerpts)  
```javascript
// Anonymous upload with size limits
match /users/{userId}/recordings/{sessionId}/final/{fileName} {
  allow write: if request.auth != null 
    && request.auth.token.firebase.sign_in_provider == 'anonymous'
    && request.resource.size < 500 * 1024 * 1024  // 500MB limit
    && fileName.matches('recording\\.(mp4|webm|mov|wav|mp3)');
}
```

---

## 🧪 Testing & Validation

### Session Validation Testing
```javascript
// Test valid session
const validResult = await validateRecordingSession('valid-session-id');
console.log(validResult.isValid); // true
console.log(validResult.sessionData.maxDuration); // 900

// Test expired session
const expiredResult = await validateRecordingSession('expired-session-id');  
console.log(expiredResult.isValid); // false
console.log(expiredResult.message); // "This recording link has expired"
```

### Upload Testing
```javascript
// Test upload process
const uploadResult = await uploadLoveRetoldRecording(
  recordingBlob,
  sessionId,
  sessionComponents,
  sessionData,
  { mediaType: 'video', maxRetries: 3 }
);

console.log(uploadResult.success); // true
console.log(uploadResult.storagePath); // users/.../final/recording.mp4
```

---

## 🚨 Error Handling

### Common Error Scenarios

#### Authentication Errors
```typescript
// Invalid authentication
{ 
  code: 'unauthenticated',
  message: 'User must be authenticated'
}

// Permission denied  
{
  code: 'permission-denied', 
  message: 'User does not have permission'
}
```

#### Session Errors
```typescript
// Session not found
{
  status: 'removed',
  message: 'This question has been removed by the account owner'
}

// Session expired
{
  status: 'expired', 
  message: 'This recording link has expired'
}
```

#### Upload Errors
```typescript
// Storage quota exceeded
{
  code: 'storage/quota-exceeded',
  message: 'Storage quota exceeded'
}

// File too large
{
  code: 'storage/invalid-format', 
  message: 'File size exceeds 500MB limit'
}
```

### Error Handling Implementation
```javascript  
// Error handling with retry logic
export const handleApiError = async (error, operation, maxRetries = 3) => {
  if (error.code === 'auth/network-request-failed' && maxRetries > 0) {
    // Retry with exponential backoff
    await new Promise(resolve => setTimeout(resolve, 1000 * (4 - maxRetries)));
    return operation(maxRetries - 1);
  }
  
  // Map specific error codes to user-friendly messages
  const errorMessages = {
    'permission-denied': 'Access denied. Please refresh and try again.',
    'unauthenticated': 'Authentication failed. Please refresh the page.',
    'storage/quota-exceeded': 'Storage limit reached. Please try again later.'
  };
  
  throw new Error(errorMessages[error.code] || error.message);
};
```

---

## 📈 Monitoring & Observability

### Key Metrics to Monitor
- **Session Validation Success Rate**: Percentage of successful validations
- **Upload Success Rate**: Percentage of successful uploads
- **Transcription Processing Time**: Average time from upload to transcription  
- **Anonymous Auth Success Rate**: Authentication failure rate
- **Storage Upload Latency**: Upload speed and reliability

### Firebase Console Monitoring
- **Functions**: Monitor `getRecordingSession` execution logs
- **Firestore**: Track `recordingSessions` read/write operations
- **Storage**: Monitor upload success rates and storage usage
- **Auth**: Track anonymous user creation rates

---

## 🔧 Configuration

### Environment Variables (Recording Client)
```bash
# Firebase Project Configuration
REACT_APP_FIREBASE_PROJECT_ID=love-retold-webapp
REACT_APP_FIREBASE_API_KEY=AIzaSyDzmURSpnS3fJhDgWDk5wDRt4I5tBv-Vb8
REACT_APP_FIREBASE_AUTH_DOMAIN=love-retold-webapp.firebaseapp.com
REACT_APP_FIREBASE_STORAGE_BUCKET=love-retold-webapp.firebasestorage.app

# API Configuration
REACT_APP_FUNCTIONS_REGION=us-central1
REACT_APP_MAX_RECORDING_DURATION=900  # 15 minutes
REACT_APP_MAX_FILE_SIZE=524288000      # 500MB
```

### API Endpoints (Master Love Retold)
```
Base URL: https://us-central1-love-retold-webapp.cloudfunctions.net

Functions:
├── getRecordingSession         # Session validation
├── createRecordingSession      # Session creation (main app)
├── createBatchRecordingSessions # Bulk session creation
├── cancelRecordingSession      # Session cancellation
└── processScheduledPrompts     # Automated processing
```

---

## 🚀 Integration Checklist

### Before Integration
- [ ] Firebase project configured (`love-retold-webapp`)
- [ ] Anonymous authentication enabled
- [ ] Firestore security rules deployed
- [ ] Storage security rules deployed
- [ ] Environment variables configured

### During Development
- [ ] Session validation implemented
- [ ] Anonymous auth flow tested
- [ ] Upload progress tracking working
- [ ] Error handling implemented
- [ ] Status update flow tested

### Before Production  
- [ ] End-to-end recording flow tested
- [ ] Cross-browser compatibility verified
- [ ] Mobile device testing completed
- [ ] Error scenarios tested
- [ ] Performance metrics validated

---

## 📞 Support

### Debugging Steps
1. **Check Firebase Console**: Functions, Firestore, Storage logs
2. **Validate Session ID Format**: Ensure proper compound format
3. **Test Authentication**: Verify anonymous auth is working
4. **Monitor Network**: Check browser network tab for API calls
5. **Verify Environment**: Confirm all REACT_APP_* variables set

### Common Issues
- **Session Not Found**: Verify session created by main Love Retold app
- **Upload Failures**: Check file size limits and storage permissions  
- **Authentication Errors**: Ensure anonymous auth is enabled in Firebase
- **CORS Errors**: Verify Firebase project configuration matches

### Getting Help
- Firebase Console error logs provide detailed debugging information
- Session validation errors include specific reason codes
- Upload errors include retry recommendations
- All API responses include structured error information

---

**Document Status**: Validated against UIAPP recording client implementation  
**Integration Verified**: January 27, 2025  
**Next Review**: After Master API updates