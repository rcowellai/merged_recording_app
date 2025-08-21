# Love Retold Integration Requirements
## Recording Upload Integration Analysis

### 🚨 CRITICAL ISSUES IDENTIFIED

The UIAPP recording upload is **failing to integrate with Love Retold** due to several architectural mismatches:

## 1. Session ID Mismatch
**❌ Current Problem:**
```javascript
// UIAPP generates random sessionIds
const sessionId = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

**✅ Required Fix:**
```javascript
// Must use the actual Love Retold sessionId from URL
const sessionId = 'j4e19zc-firstspa-myCtZuIW-myCtZuIW-1755603545';
```

## 2. User ID Authentication Mismatch
**❌ Current Problem:**
```javascript
// UIAPP uses anonymous user
const userId = 'anonymous';
```

**✅ Required Fix:**
```javascript
// Must use the actual Love Retold userId from session
const userId = sessionComponents.userId; // 'myCtZuIWCSX6J0S7QEyI5ISU2Xk1'
```

## 3. Storage Path Structure Mismatch
**❌ Current Problem:**
```javascript
// UIAPP uploads to random paths
`users/anonymous/recordings/recording_1234567890_abc123/`
```

**✅ Required Structure:**
```javascript
// Must follow Love Retold conventions
`users/${userId}/recordings/${sessionId}/chunks/`
`users/${userId}/recordings/${sessionId}/final/recording.${extension}`
`users/${userId}/recordings/${sessionId}/thumbnail.jpg`
```

---

## 📋 INFORMATION NEEDED FROM LOVE RETOLD TEAM

### 1. **Exact Storage Path Specifications**
**Question:** What are the exact Firebase Storage paths Love Retold expects?

**Based on UIAPP sessionParser.js, I found:**
```javascript
chunksFolder: `users/${userId}/recordings/${sessionId}/chunks/`
chunkPath: (chunkIndex) => `users/${userId}/recordings/${sessionId}/chunks/chunk-${chunkIndex}`
finalPath: (extension) => `users/${userId}/recordings/${sessionId}/final/recording.${extension}`
thumbnailPath: `users/${userId}/recordings/${sessionId}/thumbnail.jpg`
```

**❓ Please confirm:**
- Are these paths correct?
- What chunk naming convention? (`chunk-0`, `chunk-1`, etc.?)
- What chunk size should be used?
- What file extensions are preferred? (`.mp4`, `.webm`, `.m4a`?)

### 2. **Firestore Document Updates**
**Question:** What Firestore documents should be updated after upload completion?

**Current session document path:**
```
Collection: recordingSessions
Document ID: j4e19zc-firstspa-myCtZuIW-myCtZuIW-1755603545
```

**❓ Required fields to update:**
```javascript
{
  status: 'completed' | 'uploaded' | 'processing' | ?,
  uploadedAt: timestamp,
  storagePath: 'users/.../final/recording.mp4',
  downloadUrl: 'https://...',
  fileSize: 1234567,
  duration: 30,
  // What other fields?
}
```

### 3. **Callback/Notification Requirements**
**Question:** How should UIAPP notify Love Retold when upload is complete?

**Options:**
- Update Firestore document only?
- Call a specific Cloud Function?
- Trigger a specific event?
- Send webhook notification?

### 4. **Metadata Requirements**
**Question:** What specific metadata does Love Retold need?

**Current UIAPP provides:**
```javascript
{
  sessionId: 'j4e19zc-firstspa-myCtZuIW-myCtZuIW-1755603545',
  userId: 'myCtZuIWCSX6J0S7QEyI5ISU2Xk1',
  fileType: 'audio' | 'video',
  mimeType: 'audio/mp4' | 'video/mp4' | 'audio/webm' | 'video/webm',
  duration: 30, // seconds
  fileSize: 1234567, // bytes
  createdAt: Date,
  uploadVersion: '2.1-uiapp-c06'
}
```

**❓ Additional fields needed:**
- Recording quality/bitrate?
- Device information?
- Browser/client details?
- Transcription data?

### 5. **Authentication & Permissions**
**Question:** What Firebase Auth approach should UIAPP use?

**Current:** Anonymous authentication only
**Options:**
- Continue with anonymous auth but use session userId for storage paths?
- Implement custom token authentication with Love Retold tokens?
- Use Firebase Auth with Love Retold user accounts?

### 6. **Error Handling & Recovery**
**Question:** How should UIAPP handle upload failures?

**Scenarios:**
- Network interruption during upload
- Invalid session (expired/removed)
- Storage quota exceeded
- Unsupported file format

**❓ Required behavior:**
- Retry logic parameters?
- Error notification to Love Retold?
- Cleanup of partial uploads?

---

## 🔧 PROPOSED INTEGRATION SOLUTION

Based on analysis, here's the integration approach:

### Phase 1: Quick Fix (Use Existing Structure)
1. **Modify UIAPP upload to use actual sessionId and userId**
2. **Follow Love Retold storage path conventions**
3. **Update recordingSession document after upload**

### Phase 2: Enhanced Integration (If Needed)
1. **Implement Love Retold-specific authentication**
2. **Add chunked upload with progress tracking**
3. **Implement callback notifications**

---

## 💻 SAMPLE INTEGRATION CODE

Here's how the upload would work with proper integration:

```javascript
// Extract actual session data from Love Retold URL
const { userId, sessionId } = sessionComponents;

// Use Love Retold storage paths
const storagePath = `users/${userId}/recordings/${sessionId}/final/recording.${extension}`;

// Upload to correct location
const uploadResult = await uploadToFirebaseStorage(blob, storagePath);

// Update Love Retold session document
await updateRecordingSession(sessionId, {
  status: 'completed',
  uploadedAt: new Date(),
  storagePath: uploadResult.storagePath,
  downloadUrl: uploadResult.downloadUrl,
  fileSize: blob.size,
  duration: recordingDuration,
  mimeType: blob.type
});
```

---

## 🎯 NEXT STEPS

1. **Love Retold Team:** Please provide answers to the 6 questions above
2. **UIAPP Team:** Implement integration fixes based on Love Retold responses
3. **Testing:** Create test recordings with proper integration
4. **Validation:** Confirm Love Retold can retrieve uploaded recordings

---

## 📞 CONTACT

For questions about this integration analysis:
- **Technical Issues:** Review this document with Love Retold backend team
- **Firebase Storage:** Confirm path structure and permissions
- **Authentication:** Clarify user authentication flow requirements

**Status:** ⏳ Waiting for Love Retold team responses to proceed with implementation