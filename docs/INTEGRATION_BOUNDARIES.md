# Love Retold Integration Boundaries
# UIAPP Recording Platform - Production Deployment

**Version:** 2.0 (Post-Consolidation)  
**Date:** January 19, 2025  
**Status:** Production Deployed  
**URL:** https://record-loveretold-app.web.app

---

## 🎯 Quick Reference: Current Architecture

### 🚀 RECORDING APP (UIAPP) - What We Own

```yaml
✅ IMPLEMENTED & DEPLOYED:
  Frontend:
    - SESSION_ID parsing from URL parameters
    - Recording interface (MP4/WebM, 30-second limit)
    - Chunked upload to Firebase Storage (10MB chunks)
    - Status updates to recordingSessions collection
    - Anonymous authentication flow
    - localStorage fallback for resilience
    - Cross-browser compatibility (98%+ achieved)
  
  Backend (Deployed):
    - validateRecordingSession Cloud Function
    - processRecording Cloud Function (trigger TBD)
    - Firestore rules for anonymous updates
    - Storage rules for anonymous uploads

❌ NOT IMPLEMENTED (By Design):
  - Session creation (Love Retold main app creates)
  - Transcription service (external integration pending)
  - Story management UI (Love Retold platform handles)
  - Email/SMS systems (Love Retold platform manages)
  - User authentication (anonymous only)
```

### 🏢 LOVE RETOLD MAIN PLATFORM - What They Own

```yaml
✅ MAIN APP RESPONSIBILITIES:
  - Session creation in recordingSessions collection
  - User authentication and management
  - Storyteller invitation system
  - Email/SMS prompt delivery
  - Story viewing and management
  - Couple dashboard interface
  - Payment and subscription handling

⚠️ SHARED RESOURCES (Coordination Required):
  - Firebase project: love-retold-webapp
  - Firestore: recordingSessions collection
  - Storage: /users/{userId}/recordings/ paths
  - Cloud Functions namespace
```

---

## 🔗 Integration Architecture

### Current Data Flow
```
Love Retold Main App          UIAPP Recording Platform
        │                              │
        ├─[Creates Session]────────────┤
        │                              │
        ├─[Sends Link]─────────────────► [User Clicks Link]
        │                              │
        │                              ├─[Validates Session]
        │                              │
        │                              ├─[Records Media]
        │                              │
        │◄─[Updates Status]────────────┤
        │                              │
        │◄─[Uploads to Storage]────────┤
        │                              │
        ├─[Processes Recording]─────────┤
        │                              │
        └─[Shows in Dashboard]─────────┘
```

### Firebase Resource Sharing
```yaml
Firestore Collections:
  recordingSessions:
    - Read: Both apps
    - Create: Love Retold main app only
    - Update: Both apps (different fields)
    - Delete: Love Retold main app only

Storage Paths:
  /users/{userId}/recordings/{sessionId}/:
    - Write: UIAPP (anonymous auth)
    - Read: Love Retold main app (authenticated)
    - Delete: Love Retold main app only

Cloud Functions:
  - validateRecordingSession: Called by UIAPP
  - processRecording: Triggered by storage uploads
  - createStory: Future integration point
```

---

## ⚠️ CRITICAL BOUNDARIES - DO NOT CROSS

### 1. Session Creation Boundary
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

### 2. Authentication Boundary
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

### 3. Storage Boundary
```yaml
NEVER:
  - Write outside /users/{userId}/recordings/ paths
  - Access other users' recordings
  - Delete recordings (cleanup is main app's job)
  
ALWAYS:
  - Use session-provided userId for paths
  - Respect 10MB chunk / 500MB total limits
  - Include proper MIME types
```

### 4. Function Deployment Boundary
```yaml
NEVER:
  - Deploy functions that conflict with main app
  - Modify shared function configurations
  - Deploy without coordination
  
ALWAYS:
  - Use granular deployment (--only functions:functionName)
  - Test in emulators first
  - Coordinate with Love Retold team for deployments
```

---

## 🛡️ Safety Protocols

### Before Making Changes

1. **Check Shared Resources**
   ```bash
   # List current functions
   firebase functions:list
   
   # Check Firestore rules
   firebase firestore:rules:get
   
   # Check Storage rules  
   firebase storage:rules:get
   ```

2. **Test in Emulators**
   ```bash
   npm run emulators
   npm start
   ```

3. **Validate No Cross-Impact**
   - Changes don't affect session creation flow
   - No modifications to main app's data
   - Storage paths remain consistent
   - Function names don't conflict

### Deployment Checklist

- [ ] Tested with Firebase emulators
- [ ] Validated rules don't break main app access
- [ ] Function deployment uses --only flag
- [ ] No changes to shared collections structure
- [ ] localStorage fallback tested
- [ ] Cross-browser validation complete
- [ ] Coordinated with Love Retold team if needed

---

## 📋 Common Pitfalls & Solutions

### Pitfall 1: Session Creation Attempts
**Issue**: Trying to create test sessions from UIAPP  
**Impact**: Breaks main app's session management  
**Solution**: Use main app to create test sessions or mock data locally

### Pitfall 2: Authenticated User Access
**Issue**: Attempting to access authenticated user data  
**Impact**: Security violation, access denied  
**Solution**: Always use anonymous auth, rely on session validation

### Pitfall 3: Storage Path Conflicts
**Issue**: Writing to incorrect storage paths  
**Impact**: Data inaccessible to main app  
**Solution**: Always use `/users/{userId}/recordings/{sessionId}/` pattern

### Pitfall 4: Function Name Collisions
**Issue**: Deploying functions with conflicting names  
**Impact**: Overwrites main app functions  
**Solution**: Use unique names, deploy with --only flag

### Pitfall 5: Rules Overwrites
**Issue**: Deploying rules that remove main app permissions  
**Impact**: Main app loses access to data  
**Solution**: Always include main app rules, test thoroughly

---

## 🔍 Monitoring Integration Health

### Key Metrics to Watch
```yaml
Firebase Console Monitoring:
  - validateRecordingSession success rate
  - Storage upload success rate
  - Anonymous auth creation rate
  - Firestore write failures
  - Function timeout frequency

Application Metrics:
  - localStorage fallback activation rate
  - Session validation failures
  - Upload retry frequency
  - Browser compatibility issues
```

### Alert Thresholds
- Session validation failure rate > 5%
- Storage upload failure rate > 10%
- Function timeout rate > 2%
- localStorage fallback rate > 20%

---

## 📞 Coordination Points

### Requires Love Retold Team Coordination:
1. **Function Deployments** - May affect shared namespace
2. **Rules Updates** - Could impact main app access
3. **Storage Structure Changes** - Affects data retrieval
4. **Session Schema Changes** - Breaks compatibility
5. **Production Deployments** - User-facing changes

### Safe Without Coordination:
1. **Frontend UI Changes** - Isolated to UIAPP
2. **localStorage Logic** - Local fallback only
3. **Error Handling** - Internal improvements
4. **Performance Optimizations** - No external impact
5. **Bug Fixes** - That don't change interfaces

---

## 🚀 Future Integration Points

### Pending Integrations
1. **Transcription Service**
   - Current: No integration visible
   - Future: Webhook from processRecording to transcription API
   - Owner: TBD (Love Retold team or external service)

2. **Story Creation Pipeline**
   - Current: processRecording exists but trigger unclear
   - Future: Automatic story creation from recordings
   - Owner: Love Retold main platform

3. **Test Session Creation**
   - Current: Must use main app
   - Future: Possible test mode for UIAPP
   - Owner: Needs design decision

---

## 📚 Reference Documentation

- [PRD.md](./PRD.md) - Product requirements and questions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) - Implementation history
- [Firebase Console](https://console.firebase.google.com/project/love-retold-webapp)

---

**Last Updated**: January 19, 2025  
**Next Review**: After C11 (MVPAPP deletion verification)