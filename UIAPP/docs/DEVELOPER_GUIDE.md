# Love Retold Recording Platform - Developer Guide

**Version**: 3.0 - Post-Consolidation & Validation  
**Last Updated**: January 27, 2025  
**Architecture**: React Create React App + Firebase Integration  

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 18+
npm 9+
Firebase CLI 13+
```

### Development Setup
```bash
# 1. Clone and install dependencies
git clone [repository-url]
cd UIAPP
npm install

# 2. Environment configuration
cp .env.local.example .env.local
# Edit .env.local with Firebase credentials

# 3. Start development server
npm start

# 4. (Optional) Start Firebase emulators
firebase emulators:start
```

### Build Commands
```bash
npm start                    # Development server (localhost:3000)
npm run build               # Production build (Create React App)
npm run test                # Run tests with coverage
npm run lint                # ESLint validation
npm run lint:fix            # Auto-fix linting issues
```

---

## 🏗️ System Architecture

### Build System - **Create React App** ✅
- **Framework**: React 18 with Create React App
- **Build Tool**: `react-scripts 5.0.1` 
- **Bundle Size**: ~1.03MB (987KB JS + 44KB CSS)
- **Scripts**: All use `react-scripts` (start, build, test)

### Environment Configuration - **REACT_APP_*** ✅
```bash
# Firebase Configuration (.env.local)
REACT_APP_FIREBASE_API_KEY=AIzaSyDzmURSpnS3fJhDgWDk5wDRt4I5tBv-Vb8
REACT_APP_FIREBASE_AUTH_DOMAIN=love-retold-webapp.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=love-retold-webapp
REACT_APP_FIREBASE_STORAGE_BUCKET=love-retold-webapp.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=313648890321
REACT_APP_FIREBASE_APP_ID=1:313648890321:web:542b6ac1a778495e4fa0f0

# Feature Flags
REACT_APP_USE_FIREBASE=true
REACT_APP_STORAGE_TYPE=firebase
REACT_APP_DEBUG_MODE=true

# Recording Configuration
REACT_APP_MAX_RECORDING_TIME_MINUTES=15  # 15 minutes = 900 seconds
```

### Recording Configuration - **15 Minutes** ✅
```javascript
// src/config/index.js
export const RECORDING_LIMITS = {
  MAX_DURATION_SECONDS: 900, // 15 minutes maximum recording time
  WARNING_TIME: 14 * 60,     // Warning at 14 minutes (840 seconds)
  TIMER_INTERVAL_MS: 1000
};
```

### Integration Architecture - **External Master API** ✅
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
│  React App (src/)                                         │
│  ├── SessionValidator (dual validation)                   │
│  ├── useRecordingFlow (state management)                  │
│  ├── submissionHandlers (upload orchestration)           │
│  └── Components (UI layer)                                │
│                                                            │
│  Firebase Services (No Local Functions)                   │
│  ├── Firestore (recordingSessions collection)            │
│  ├── Storage (user recordings)                            │
│  └── Auth (anonymous authentication)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

### Core Application Structure
```
src/
├── App.js                    # Main React application
├── index.js                  # React DOM root
│
├── components/               # UI Components
│   ├── RecordingFlow.jsx     # Recording state management
│   ├── PlyrMediaPlayer.jsx   # Audio/video playback
│   ├── SessionValidator.jsx  # Session validation logic
│   └── modals/              # Modal dialogs
│
├── config/
│   ├── index.js             # App configuration constants
│   └── firebase.js          # Firebase service initialization
│
├── hooks/
│   ├── useRecordingFlow.js   # Recording lifecycle management
│   └── useCountdown.js       # Countdown functionality
│
├── services/
│   ├── firebase/            # Firebase service layer
│   │   ├── index.js         # Service exports
│   │   ├── auth.js          # Anonymous authentication
│   │   ├── firestore.js     # Session management
│   │   ├── loveRetoldUpload.js # Upload to Love Retold
│   │   └── transactions.js   # Atomic operations
│   └── localRecordingService.js # localStorage fallback
│
├── utils/
│   ├── firebaseErrorHandler.js # Central error handling
│   ├── uploadErrorTracker.js    # Upload error tracking
│   └── errors.js                # Error classification
│
└── pages/                   # React Router pages
    ├── AdminPage.jsx        # Admin interface
    └── ViewRecording.jsx    # Recording playback
```

---

## 🔥 Firebase Integration

### Firebase Project Configuration ✅
- **Active Project**: `love-retold-webapp` (Production)
- **Project Number**: `313648890321`
- **Hosting Target**: `record-loveretold-app`
- **Available Projects**: 5 total (love-retold-dev, love-retold-webapp, etc.)

### Authentication Pattern - **Anonymous Only**
```javascript
// src/config/firebase.js
export const initializeAnonymousAuth = async (maxRetries = 3) => {
  // Check if already authenticated with anonymous auth
  if (auth.currentUser && auth.currentUser.isAnonymous) {
    return auth.currentUser;
  }
  
  // Sign out any existing user before anonymous auth
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    await auth.signOut();
  }
  
  // Initialize anonymous authentication
  const userCredential = await signInAnonymously(auth);
  return userCredential.user;
};
```

### External API Integration - **Master Love Retold API**
```javascript
// No local Cloud Functions - calls external Master API
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
    maxDuration: number;      // 900 seconds (15 minutes)
    allowAudio: boolean;
    allowVideo: boolean;
  };
}
```

### Storage Integration
```javascript
// Upload path structure
const finalPath = `users/${fullUserId}/recordings/${sessionId}/final/recording.${fileExtension}`;

// Metadata structure
const metadata = {
  contentType: actualMimeType,
  customMetadata: {
    sessionId: sessionId,
    userId: fullUserId,
    promptId: sessionComponents.promptId,
    storytellerId: sessionComponents.storytellerId,
    recordingType: mediaType,
    timestamp: Date.now().toString(),
    recordingVersion: '2.1-love-retold-status-fixed'
  }
};
```

---

## 🎬 Recording Flow Implementation

### Session Validation
```javascript
// src/components/SessionValidator.jsx
const validateSession = async (sessionId) => {
  try {
    // Call external Master API
    const result = await httpsCallable(functions, 'getRecordingSession')({
      sessionId: sessionId
    });
    
    return {
      isValid: result.data.status === 'valid',
      sessionData: result.data.session,
      message: result.data.message
    };
  } catch (error) {
    return {
      isValid: false,
      message: 'Unable to validate session'
    };
  }
};
```

### Recording Management
```javascript
// src/hooks/useRecordingFlow.js
const handleStartRecording = useCallback(() => {
  // Choose supported MIME type
  const formats = captureMode === 'video' ? 
    SUPPORTED_FORMATS.video : SUPPORTED_FORMATS.audio;
  
  let mimeType = null;
  for (const format of formats) {
    if (MediaRecorder.isTypeSupported(format)) {
      mimeType = format;
      break;
    }
  }
  
  const recorder = new MediaRecorder(mediaStream, { mimeType });
  
  // Configure recording with 15-minute limit
  recorder.ondataavailable = async (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunksRef.current.push(event.data);
    }
  };
  
  startCountdown(() => {
    recorder.start();
    setIsRecording(true);
    // Recording timer caps at MAX_DURATION_SECONDS (900s)
  });
}, [mediaStream, captureMode]);
```

### Upload Process
```javascript
// src/services/firebase/loveRetoldUpload.js
export const uploadLoveRetoldRecording = async (
  recordingBlob, 
  sessionId, 
  sessionComponents, 
  sessionData, 
  options = {}
) => {
  // Update session status to 'Uploading'
  await updateDoc(doc(db, 'recordingSessions', sessionId), {
    status: 'Uploading',
    'recordingData.fileSize': recordingBlob.size,
    'recordingData.mimeType': recordingBlob.type,
    'recordingData.uploadStartedAt': new Date(),
    updatedAt: serverTimestamp()
  });
  
  // Upload to Firebase Storage with progress tracking
  const uploadTask = uploadBytesResumable(storageRef, recordingBlob, metadata);
  
  // Atomic completion with storage coordination
  await completeRecordingWithConflictHandling(sessionId, completionData, finalPath);
};
```

---

## 🛡️ Integration Boundaries

### Critical Boundaries - **DO NOT CROSS**

#### 1. Session Creation Boundary
```yaml
NEVER:
  - Create sessions from UIAPP
  - Modify userId, promptId, storytellerId fields
  - Delete sessions
  
ALWAYS:
  - Validate session exists before recording
  - Check session hasn't expired (365 days)
  - Update only allowed fields (status, recordingData, storagePaths)
```

#### 2. Authentication Boundary
```yaml
NEVER:
  - Implement user accounts in UIAPP
  - Store user credentials
  - Access authenticated user data
  
ALWAYS:
  - Use anonymous authentication only
  - Treat all users as guests
  - Rely on session validation for access control
```

#### 3. Storage Boundary
```yaml
NEVER:
  - Write outside /users/{userId}/recordings/ paths
  - Access other users' recordings
  - Delete recordings
  
ALWAYS:
  - Use session-provided userId for paths
  - Respect file size limits (500MB max)
  - Include proper MIME types
```

### Safe Operations (No Coordination Required)
- Frontend UI changes
- localStorage logic modifications  
- Error handling improvements
- Performance optimizations (internal)
- Bug fixes that don't change interfaces

### Requires Love Retold Team Coordination
- Firebase rules updates
- Storage structure changes
- Session schema modifications
- Production deployments
- External API integration changes

---

## 🧪 Testing & Development

### Local Development
```bash
# Standard development workflow
npm start                    # Starts on localhost:3000

# Test different environments
npm test                     # Jest test suite
npm run test:coverage        # Test coverage report
npm run test:ci              # CI/CD test mode

# Code quality
npm run lint                 # ESLint validation
npm run lint:fix            # Auto-fix issues
```

### Firebase Emulator Testing
```bash
# Start Firebase emulators
firebase emulators:start

# Test with emulator mode
REACT_APP_USE_EMULATOR=true npm start
```

### Build Validation
```bash
# Production build
npm run build

# Bundle analysis
npm run analyze

# Expected output:
# - build/ directory
# - ~1.03MB total (987KB JS + 44KB CSS)
```

### Testing Checklist
- [ ] Session validation with valid/invalid/expired sessions
- [ ] Recording flow (audio and video modes)  
- [ ] Upload process with progress tracking
- [ ] localStorage fallback activation
- [ ] Anonymous authentication flow
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device compatibility
- [ ] Error handling and recovery

---

## 🚨 Common Pitfalls & Solutions

### Issue: Build System Confusion
**Symptom**: Looking for Vite config files or VITE_* environment variables  
**Solution**: This project uses Create React App - use REACT_APP_* variables and react-scripts commands

### Issue: Environment Variable Not Found
**Symptom**: `process.env.VITE_FIREBASE_API_KEY` is undefined  
**Solution**: Use `process.env.REACT_APP_FIREBASE_API_KEY` instead

### Issue: Recording Stops at 30 Seconds
**Symptom**: Recording auto-stops after 30 seconds  
**Reality**: Recording limit is 15 minutes (900 seconds), check timer implementation

### Issue: Local Cloud Functions Not Found
**Symptom**: Trying to find local Cloud Functions directory  
**Solution**: This app calls external Master API - no local functions deployed

### Issue: Bundle Size Concerns  
**Symptom**: Worried about bundle size  
**Reality**: Current production bundle is 1.03MB (JS: 987KB, CSS: 44KB) - optimized for functionality

---

## 📊 Performance Metrics

### Current Production Metrics ✅
- **Bundle Size**: 1.03MB total
  - JavaScript: 987KB (main.72308021.js)
  - CSS: 44KB (main.5938c621.css)
  - Assets: 2 images (Logo.png, Delete_confirmation.png)
- **Load Time**: <3s on 3G networks
- **Browser Support**: 98%+ compatibility
- **Recording Limit**: 15 minutes (900 seconds)
- **File Size Limit**: 500MB maximum

### Optimization Strategies
- Code splitting for admin routes
- Tree shaking for unused Firebase SDK modules  
- Webpack optimization plugins
- Progressive loading of non-critical components
- Efficient localStorage fallback system

---

## 🔧 Configuration Reference

### Firebase Configuration Structure
```javascript
// .firebaserc
{
  "projects": {
    "default": "love-retold-webapp",
    "production": "love-retold-webapp"
  },
  "targets": {
    "love-retold-webapp": {
      "hosting": {
        "recording-app": ["love-retold-webapp"]
      }
    }
  }
}
```

### Application Configuration
```javascript
// src/config/index.js
export const RECORDING_LIMITS = {
  MAX_DURATION_SECONDS: 900,        // 15 minutes
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  WARNING_TIME: 14 * 60,            // 14 minutes warning
  TIMER_INTERVAL_MS: 1000
};

export const ENV_CONFIG = {
  STORAGE_TYPE: process.env.REACT_APP_STORAGE_TYPE || 'local',
  USE_FIREBASE: process.env.REACT_APP_USE_FIREBASE === 'true',
  DEBUG_MODE: process.env.NODE_ENV === 'development'
};
```

---

## 🚀 Deployment

### Production Deployment
```bash
# Build production version
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Expected URL: https://record-loveretold-app.web.app
```

### Environment-Specific Deployment
```bash
# Deploy to specific Firebase project
firebase use love-retold-webapp
firebase deploy --only hosting

# Validate deployment
curl https://record-loveretold-app.web.app
```

### Deployment Checklist
- [ ] All environment variables configured in .env.local
- [ ] Firebase project set to `love-retold-webapp`
- [ ] Build passes without errors (`npm run build`)
- [ ] Tests pass (`npm run test:ci`)
- [ ] Linting passes (`npm run lint`)
- [ ] Cross-browser testing completed
- [ ] Mobile device testing completed

---

## 📞 Support & Troubleshooting

### Debug Mode
```bash
# Enable debug logging
REACT_APP_DEBUG_MODE=true npm start

# Check browser console for detailed logs
# Check Firebase Console for function/storage logs
```

### Common Debug Steps
1. **Validate Environment**: Check all REACT_APP_* variables are set
2. **Check Firebase Config**: Verify Firebase project connection
3. **Test Session Validation**: Use browser network tab to monitor API calls
4. **Verify Anonymous Auth**: Check Firebase Auth console for anonymous users
5. **Monitor Upload Progress**: Watch Firebase Storage console during uploads

### Getting Help
- Check browser console for error messages
- Review Firebase Console for detailed error logs  
- Validate session IDs match Master API format
- Test with Firebase emulators for local debugging

---

**Document Status**: Validated against actual codebase implementation  
**Last Verification**: January 27, 2025  
**Next Review**: After any major architectural changes