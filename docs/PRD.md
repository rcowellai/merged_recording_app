# Product Requirements Document (PRD)
# Love Retold Recording Platform - UIAPP

**Version:** 3.0 (Post-Consolidation)  
**Date:** January 19, 2025  
**Status:** Current Production Deployment  
**Endpoint:** https://record-loveretold-app.web.app

---

## 1. Executive Summary

### 1.1 Product Vision
The Love Retold Recording Platform provides a frictionless audio/video memory capture experience for wedding storytellers. Accessible via unique session links, the platform automatically processes recordings into the Love Retold couples' story books with zero user friction.

### 1.2 Business Objectives
- **Primary**: Zero-friction memory recording for Love Retold's wedding platform
- **Secondary**: 98%+ cross-browser compatibility for maximum accessibility
- **Tertiary**: Resilient infrastructure with automatic fallback mechanisms

### 1.3 Success Metrics
- **Recording Success Rate**: ≥95% with automatic localStorage fallback
- **Browser Compatibility**: 98% (Chrome, Firefox, Safari, Edge, Mobile)
- **Page Load Time**: <3s on 3G networks (current: 276.72kB bundle)
- **Session Validation**: 4-second timeout with graceful degradation
- **Upload Resilience**: Chunked uploads with 3x retry logic

---

## 2. User Journey

### 2.1 Recording Flow (Current Implementation)
1. **Session Link** → Storyteller receives unique URL with SESSION_ID parameter
2. **Validation** → validateRecordingSession Cloud Function (4s timeout)
3. **Permission** → Browser media permission request (audio/video)
4. **Countdown** → 3-2-1-BEGIN visual countdown
5. **Recording** → 30-second max duration with pause/resume
6. **Review** → Plyr media player for playback
7. **Upload** → Firebase Storage with localStorage fallback
8. **Completion** → Confetti animation and success confirmation

### 2.2 Session States
- `pending` → Initial state, ready for recording
- `active` → Recording in progress
- `recording` → Media capture active
- `uploading` → Upload to Firebase Storage
- `processing` → Server-side transcription
- `completed` → Successfully stored
- `failed` → Error with recovery options
- `expired` → 365-day expiration reached

---

## 3. Functional Requirements

### 3.1 Session Management (Implemented)
- **URL Parsing**: SESSION_ID from query parameters
- **Firebase Validation**: validateRecordingSession function
- **Anonymous Auth**: Firebase anonymous authentication
- **Status Display**: Real-time session status updates
- **Expiration**: 365-day session lifetime

### 3.2 Recording Capabilities (Implemented)
- **Media Types**: Audio-only and audio+video modes
- **Duration**: 30-second maximum with auto-stop
- **Controls**: Start, pause, resume, stop, re-record
- **Preview**: Live video preview during recording
- **Formats**: MP4 (preferred), WebM (fallback)
- **Countdown**: 3-2-1-BEGIN animation

### 3.3 Upload System (Implemented)
- **Primary**: Firebase Storage chunked upload
  - Path: `/users/{userId}/recordings/{sessionId}/`
  - Chunks: 10MB max per chunk
  - Final: 500MB max total
- **Fallback**: localStorage with blob URLs
  - Automatic activation on Firebase errors
  - Simulated progress for UX consistency
  - Admin page for local recording management

### 3.4 Error Handling (C08 Implementation)
- **Retry Logic**: 3 attempts with exponential backoff
- **Error Mapping**: 40+ Firebase error codes handled
- **Fallback Chain**: Firebase → localStorage → error display
- **Recovery UI**: Clear user messaging and retry options
- **Error Boundary**: React error boundary prevents crashes

---

## 4. Technical Architecture

### 4.1 Frontend Stack
- **Framework**: React 18 with hooks
- **Bundler**: Webpack with code splitting
- **State**: useReducer pattern + custom hooks
- **Styling**: CSS Modules + Tailwind utilities
- **Media**: MediaRecorder API + Plyr.js player

### 4.2 Backend Services
- **Authentication**: Firebase Auth (anonymous)
- **Database**: Firestore (recordingSessions collection)
- **Storage**: Firebase Storage (chunked uploads)
- **Functions**: validateRecordingSession, processRecording
- **Hosting**: Firebase Hosting (record-loveretold-app.web.app)

### 4.3 Service Architecture
```
src/services/
├── firebase/
│   ├── index.js         # Service orchestration
│   ├── auth.js          # Anonymous authentication (C04)
│   ├── functions.js     # Session validation (C05/C03)
│   ├── firestore.js     # Session management (C04)
│   ├── storage.js       # Upload/download (C05)
│   └── recording.js     # Recording workflow (C06)
├── firebaseStorage.js   # Storage operations (C07)
└── localRecordingService.js # localStorage fallback
```

### 4.4 Key Configurations
- **Environment**: VITE_* variables for Firebase config
- **Feature Flags**: VITE_STORAGE_TYPE (firebase/local)
- **Limits**: 30s recording, 500MB storage, 10MB chunks
- **Timeouts**: 4s function calls, 30s upload timeout

---

## 5. Security Model

### 5.1 Firestore Rules
- **Anonymous Access**: Read all recordingSessions
- **Limited Updates**: Only status and recording data fields
- **Owner Access**: Full control for authenticated users
- **Field Protection**: Cannot change userId, promptId, storytellerId

### 5.2 Storage Rules
- **Anonymous Upload**: Allowed with session validation
- **Size Limits**: 10MB chunks, 500MB total, 5MB thumbnails
- **Path Enforcement**: Strict path patterns required
- **Content Type**: Only audio/video MIME types

---

## 6. Questions to Confirm

### 6.1 Session Creation Flow
**Current**: Sessions are created by Love Retold main app, not the recording app.
**Question**: Should the recording app have ability to create test sessions?

### 6.2 Processing Pipeline
**Current**: processRecording Cloud Function exists but trigger unclear.
**Question**: What triggers recording processing - storage upload or manual trigger?

### 6.3 Transcription Service
**Current**: No transcription service integration visible in codebase.
**Question**: Is transcription handled by separate service or pending implementation?

---

## 7. Performance & Monitoring

### 7.1 Current Metrics
- **Bundle Size**: 276.72kB (gzipped)
- **Load Time**: <3s on 3G (validated)
- **Memory Usage**: <100MB for 30s recording
- **Browser Support**: 98%+ compatibility achieved

### 7.2 Monitoring Points
- Firebase Console for functions/storage metrics
- Browser console logging (filtered in production)
- Error reporting to localStorage
- Network retry attempts logged

---

## 8. Deployment Status

### 8.1 Production (C10 Completed)
- **URL**: https://record-loveretold-app.web.app
- **Functions**: validateRecordingSession deployed
- **Rules**: Firestore and Storage rules active
- **Fallback**: localStorage operational

### 8.2 Next Steps (C11 Pending)
- Verify MVPAPP can be safely deleted
- Monitor production metrics
- Address any edge cases from real usage

---

## Document History
- v3.0 (2025-01-19): Consolidated from implementation reality
- v2.0 (2025-01-18): Post-consolidation update
- v1.0 (2025-01-01): Initial PRD from MVPAPP