# Technical Architecture Document
# Love Retold Recording Platform - UIAPP

**Version:** 1.0  
**Date:** January 19, 2025  
**Status:** Production Deployment

---

## 1. System Architecture

### 1.1 High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Client)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React     │  │ MediaRecorder│  │  localStorage│      │
│  │   UIAPP     │  │     API      │  │   Fallback   │      │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Services                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Auth (Anon)   │  │  Firestore   │  │   Storage    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────────────────────────────────────────┐      │
│  │          Cloud Functions (validateSession)        │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 System Boundaries
- **Frontend**: React SPA hosted on Firebase Hosting
- **Backend**: Firebase services (Auth, Firestore, Storage, Functions)
- **Fallback**: Browser localStorage for offline/error scenarios
- **External**: Love Retold main app creates sessions

---

## 2. Data Flow Architecture

### 2.1 Recording Flow
```
1. Session Link → UIAPP/?sessionId=xxx
2. Anonymous Auth → Firebase Auth Service
3. Session Validation → validateRecordingSession Cloud Function
4. Media Capture → MediaRecorder API (30s max)
5. Chunked Processing → 10MB chunks in memory
6. Upload Path Decision:
   ├─ Success → Firebase Storage
   │   └─ /users/{userId}/recordings/{sessionId}/
   └─ Failure → localStorage Fallback
       └─ IndexedDB blob storage
7. Status Updates → Firestore recordingSessions
8. Completion → UI confirmation
```

### 2.2 Session Lifecycle
```
Created (Main App) → pending → active → recording → 
uploading → processing → completed
                ↓ (error)
              failed → retry → completed
```

---

## 3. Service Layer Architecture

### 3.1 Service Organization
```
src/services/
├── firebase/
│   ├── index.js          # Central orchestration & exports
│   ├── auth.js           # Anonymous authentication (C04)
│   ├── functions.js      # Cloud Function calls (C05/C03)
│   ├── firestore.js      # Session management (C04)
│   ├── storage.js        # Storage operations (C05)
│   └── recording.js      # Recording workflow (C06)
├── firebaseStorage.js    # Download & retrieval (C07)
└── localRecordingService.js # localStorage fallback
```

### 3.2 Service Dependencies
- **recording.js** → storage.js, firestore.js
- **storage.js** → auth.js, firestore.js
- **firestore.js** → auth.js
- **functions.js** → standalone
- **All services** → firebaseErrorHandler.js

### 3.3 Error Handling Architecture (C08)
```
src/utils/
├── firebaseErrorHandler.js  # Central error handler
│   ├── withRetry()          # 3x retry with backoff
│   ├── mapFirebaseError()   # 40+ error codes
│   └── log()                # PII-safe logging
├── errors.js                # Error constants
└── FirebaseErrorBoundary.jsx # React error boundary
```

---

## 4. Firebase Infrastructure

### 4.1 Cloud Functions
```typescript
// functions/src/index.ts
export {
  validateSession,           // Session validation
  validateRecordingSession,  // Alias for compatibility
  createStory,              // Story creation (future)
  processRecording,         // Storage-triggered processing
  warmup                    // Cold start prevention
}
```

**Function Configurations**:
- Region: us-central1
- Memory: 512MiB
- Timeout: 60 seconds
- Max Instances: 100

### 4.2 Firestore Schema
```javascript
// recordingSessions collection
{
  sessionId: string,
  userId: string,
  promptId: string,
  storytellerId: string,
  status: enum['pending','active','recording','uploading','processing','completed','failed'],
  promptText: string,
  coupleNames: string,
  storytellerName: string,
  createdAt: timestamp,
  expiresAt: timestamp,
  recordingData: {
    duration: number,
    mimeType: string,
    size: number
  },
  storagePaths: {
    chunks: string[],
    final: string,
    thumbnail: string
  },
  error: object
}
```

### 4.3 Storage Structure
```
/users/{userId}/
  /recordings/{sessionId}/
    /chunks/
      chunk-0          # 10MB chunks
      chunk-1
      ...
    /final/
      recording.mp4    # Final assembled file
    thumbnail.jpg      # Video thumbnail
  /memories/{memoryId}/
    /recordings/
      {timestamp}_recording.mp4
```

---

## 5. Security Architecture

### 5.1 Firestore Rules (Key Excerpts)
```javascript
// recordingSessions - Anonymous can update limited fields
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
*Full rules: [firestore.rules](../UIAPP/firestore.rules)*

### 5.2 Storage Rules (Key Excerpts)
```javascript
// Anonymous upload with size limits
match /users/{userId}/recordings/{sessionId}/chunks/{fileName} {
  allow write: if request.auth != null 
    && request.auth.token.firebase.sign_in_provider == 'anonymous'
    && request.resource.size < 10 * 1024 * 1024  // 10MB
    && fileName.matches('chunk-[0-9]+');
}
```
*Full rules: [storage.rules](../UIAPP/storage.rules)*

---

## 6. Error Handling & Fallback Strategy

### 6.1 Retry Logic
```javascript
// firebaseErrorHandler.withRetry()
- Initial attempt
- Retry 1: 1s delay
- Retry 2: 2s delay  
- Retry 3: 4s delay
- Fallback to localStorage
```

### 6.2 Fallback Chain
1. **Primary**: Firebase Storage upload
2. **Secondary**: localStorage with blob URLs
3. **Tertiary**: Error display with recovery options

### 6.3 Error Categories
- **Auth Errors**: Anonymous auth failures
- **Network Errors**: Timeout, offline
- **Storage Errors**: Quota, permissions
- **Validation Errors**: Invalid session, expired

---

## 7. Configuration & Environment

### 7.1 Environment Variables
```bash
# Firebase Configuration (VITE_* prefix)
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID

# Feature Flags
VITE_STORAGE_TYPE=firebase|local
VITE_DEBUG_MODE=true|false
```

### 7.2 Feature Toggles
- **Storage Type**: Firebase vs localStorage
- **Debug Mode**: Console logging verbosity
- **Upload Chunking**: Enable/disable chunked uploads
- **Retry Logic**: Configurable retry attempts

---

## 8. Performance Optimizations

### 8.1 Bundle Optimization
- **Current Size**: 276.72kB (gzipped)
- **Code Splitting**: Lazy loading for admin routes
- **Tree Shaking**: Unused Firebase SDK removal
- **Compression**: Webpack optimization plugins

### 8.2 Runtime Optimizations
- **Chunked Uploads**: 10MB chunks prevent memory overflow
- **Garbage Collection**: Automatic blob cleanup
- **Lazy Auth**: Anonymous auth on-demand
- **Function Warmup**: 5-minute ping prevents cold starts

### 8.3 Network Optimizations
- **Progressive Upload**: Upload during recording
- **Retry Logic**: Exponential backoff
- **Timeout Management**: 4s function, 30s upload
- **Caching**: Browser cache for static assets

---

## 9. Deployment Architecture

### 9.1 Build Process
```bash
npm run build
# Output: build/ directory
# Bundle: ~276kB gzipped
```

### 9.2 Deployment Pipeline
```bash
# Functions deployment (granular)
firebase deploy --only functions:validateRecordingSession

# Rules deployment
firebase deploy --only firestore:rules
firebase deploy --only storage:rules

# Hosting deployment
firebase deploy --only hosting
```

### 9.3 Production URLs
- **App**: https://record-loveretold-app.web.app
- **Firebase Project**: love-retold-webapp
- **Functions Region**: us-central1

---

## 10. Monitoring & Observability

### 10.1 Logging Points
- Firebase Console → Functions logs
- Firebase Console → Storage metrics
- Browser Console → Debug logs (dev only)
- localStorage → Error history

### 10.2 Key Metrics
- Session validation success rate
- Upload success/failure ratio
- Function execution times
- Storage bandwidth usage
- Error frequency by type

### 10.3 Alerting Thresholds
- Function timeout >4s
- Upload failure rate >5%
- Storage quota >80%
- Cold start frequency

---

## 11. Architecture Decisions

### 11.1 Why Anonymous Auth?
- Zero friction for storytellers
- No account creation required
- Session-based access control
- Simplified user journey

### 11.2 Why Chunked Uploads?
- Memory efficiency (<100MB usage)
- Progressive upload during recording
- Resilience to network interruptions
- Better mobile device support

### 11.3 Why localStorage Fallback?
- Offline recording capability
- Network failure resilience
- Zero data loss guarantee
- Seamless user experience

### 11.4 Why 30-Second Limit?
- Memory constraints on mobile
- Optimal for story snippets
- Reduces processing time
- Better completion rates

---

## Document History
- v1.0 (2025-01-19): Initial architecture documentation from current implementation