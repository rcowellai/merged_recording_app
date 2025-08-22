# Recording App Firebase Integration Guide

This document outlines the Firebase integration requirements for the Love Retold recording webapp, including allowed fields, required updates, and the transcription trigger process.

## 🔐 Security Context

The recording app operates with **anonymous Firebase authentication** with restricted Firestore permissions. You can only update specific whitelisted fields in the `recordingSessions` collection.

## 📋 Allowed Fields for Anonymous Updates

Based on the Firestore security rules, you can ONLY update these fields:

### ✅ Core Status Fields
```typescript
status: 'Recording' | 'Uploading' | 'ReadyForTranscription' | 'failed'
recordingStartedAt: Timestamp
recordingCompletedAt: Timestamp
error: ErrorObject
```

### ✅ Recording Data (recordingData.*)
All subfields under `recordingData` are allowed:
```typescript
recordingData: {
  duration?: number;           // Recording duration in seconds
  fileSize?: number;           // Final file size in bytes
  mimeType?: string;           // 'video/webm', 'video/mp4', 'audio/webm', etc.
  chunksCount?: number;        // Number of chunks uploaded
  uploadProgress: number;      // 0-100 upload completion percentage
  lastChunkUploaded?: number;  // Index of last successfully uploaded chunk
  // Add any other metadata you need here
}
```

### ✅ Storage Paths (storagePaths.*)
All subfields under `storagePaths` are allowed:
```typescript
storagePaths: {
  chunksFolder?: string;       // Path to chunks directory
  finalVideo?: string;         // Path to final assembled recording
  thumbnail?: string;          // Path to video thumbnail (if generated)
  // Add any other storage paths you need here
}
```

### ❌ Forbidden Fields
You CANNOT update these fields (attempts will be rejected):
- `userId`, `promptId`, `storytellerId` (ownership fields)
- `sessionId`, `promptText`, `askerName`, `storytellerName` (core data)
- `createdAt`, `expiresAt` (system timestamps)
- `transcription.*` (managed by Love Retold functions)
- Any field not explicitly listed above

## 🔄 Required Status Transitions

### Valid Status Flow
```
ReadyForRecording → Recording → Uploading → ReadyForTranscription
                      ↓             ↓              ↓
                   failed        failed        failed
```

### Status Transition Rules
- **FROM**: Can only transition from `['ReadyForRecording', 'Recording', 'Uploading', 'failed']`
- **TO**: Can only transition to `['Recording', 'Uploading', 'ReadyForTranscription', 'failed']`
- Cannot skip status levels (e.g., ReadyForRecording → ReadyForTranscription)
- Cannot transition to 'Transcribed' (only Love Retold functions can set this)

## 📝 Step-by-Step Integration

### Step 1: Start Recording
When user begins recording:
```typescript
await sessionRef.update({
  status: 'Recording',
  recordingStartedAt: serverTimestamp(),
  'recordingData.uploadProgress': 0
});
```

### Step 2: During Progressive Upload
As chunks are uploaded:
```typescript
await sessionRef.update({
  status: 'Uploading',
  'recordingData.chunksCount': totalChunks,
  'recordingData.lastChunkUploaded': chunkIndex,
  'recordingData.uploadProgress': Math.round((chunkIndex + 1) / totalChunks * 100),
  'storagePaths.chunksFolder': `users/${userId}/recordings/${sessionId}/chunks/`
});
```

### Step 3: Complete Recording & Assembly
After final file is assembled and uploaded:
```typescript
await sessionRef.update({
  status: 'ReadyForTranscription',
  recordingCompletedAt: serverTimestamp(),
  'recordingData.duration': durationInSeconds,
  'recordingData.fileSize': fileSizeInBytes,
  'recordingData.mimeType': 'video/mp4', // or actual mime type
  'recordingData.uploadProgress': 100,
  'storagePaths.finalVideo': `users/${userId}/recordings/${sessionId}/final/recording.mp4`
});
```

### Step 4: Error Handling
If recording fails at any point:
```typescript
await sessionRef.update({
  status: 'failed',
  error: {
    code: 'UPLOAD_FAILED', // or other error code
    message: 'Detailed error message',
    timestamp: serverTimestamp(),
    retryable: true,
    retryCount: 0
  }
});
```

## 🚀 Transcription Trigger Requirements

### Critical: How to Trigger Love Retold Processing

The Love Retold transcription pipeline is triggered by **two conditions**:

1. **Status Update**: Session status becomes `'ReadyForTranscription'`
2. **Final File**: `storagePaths.finalVideo` contains a valid storage path

### Storage Path Requirements

**Required Path Structure**:
```
users/{userId}/recordings/{sessionId}/final/recording.{ext}
```

**Supported File Extensions**: `.mp4`, `.webm`, `.mov`, `.avi` (video) or `.wav`, `.mp3`, `.webm` (audio)

**Example Valid Paths**:
```typescript
// Video recording
'storagePaths.finalVideo': 'users/abc123/recordings/xyz789/final/recording.mp4'

// Audio recording  
'storagePaths.finalVideo': 'users/abc123/recordings/xyz789/final/recording.webm'
```

### Firebase Storage Upload Requirements

1. **Upload final assembled file** to the exact path specified in `storagePaths.finalVideo`
2. **File must be complete** - partial uploads will cause processing failures
3. **Update Firestore** with final path and status change to trigger processing

### Complete Trigger Example
```typescript
// 1. Upload final file to Firebase Storage
const finalPath = `users/${userId}/recordings/${sessionId}/final/recording.mp4`;
await uploadToFirebaseStorage(assembledVideoBlob, finalPath);

// 2. Update Firestore to trigger transcription
await sessionRef.update({
  status: 'ReadyForTranscription',
  recordingCompletedAt: serverTimestamp(),
  'recordingData.duration': 180,
  'recordingData.fileSize': 15728640,
  'recordingData.mimeType': 'video/mp4',
  'recordingData.uploadProgress': 100,
  'storagePaths.finalVideo': finalPath
});

// Love Retold functions will automatically:
// - Detect the status change to 'ReadyForTranscription'
// - Process the file at storagePaths.finalVideo
// - Generate transcription
// - Create story from recording
// - Update status to 'Transcribed'
```

## 💾 Storage Architecture

### Recommended Storage Structure
```
users/{userId}/recordings/{sessionId}/
├── chunks/                    ← Optional: For progressive upload chunks
│   ├── chunk_0.webm
│   ├── chunk_1.webm
│   └── chunk_N.webm
└── final/                     ← Required: For Love Retold processing
    ├── recording.mp4          ← Required: Final assembled recording
    └── thumbnail.jpg          ← Optional: Generated by Love Retold
```

### Chunk Management
- **Chunks are optional** for Love Retold processing
- Use `storagePaths.chunksFolder` to track chunk location for cleanup
- Love Retold only processes the final assembled file
- You can delete chunks after successful final upload

## 🔍 Field Usage Examples

### Progressive Upload Metadata
Store detailed upload information in `recordingData`:
```typescript
recordingData: {
  // Basic recording info
  duration: 180,
  fileSize: 15728640,
  mimeType: 'video/webm',
  
  // Progressive upload specific
  chunksCount: 12,
  lastChunkUploaded: 11,
  uploadProgress: 100,
  
  // Custom metadata (all allowed under recordingData.*)
  bitrate: 1000000,
  resolution: '720p',
  codec: 'vp8',
  uploadStartedAt: '2024-01-15T10:30:00Z',
  uploadMethod: 'progressive_chunks'
}
```

### Storage Path Management
```typescript
storagePaths: {
  // Optional: For chunk cleanup and debugging
  chunksFolder: 'users/abc123/recordings/xyz789/chunks/',
  
  // Required: For Love Retold processing
  finalVideo: 'users/abc123/recordings/xyz789/final/recording.mp4',
  
  // Optional: Generated by Love Retold after processing
  thumbnail: 'users/abc123/recordings/xyz789/thumbnail.jpg'
}
```

## ⚠️ Important Notes

### Security Constraints
- **Anonymous authentication only** - no user profile access
- **Limited field updates** - only whitelisted fields allowed
- **No ownership changes** - cannot modify userId, promptId, storytellerId
- **Read access allowed** - can read session data for validation

### File Type Handling
- **No explicit fileType field needed** - use `recordingData.mimeType`
- **Love Retold determines type** from Firebase Storage metadata
- **Support both video and audio** recordings

### Error Recovery
- Always include detailed error information in the `error` field
- Set `retryable: true` for temporary failures
- Use meaningful error codes for debugging

### Performance Tips
- **Batch Firestore updates** when possible
- **Update upload progress** regularly for user feedback
- **Clean up chunks** after successful final upload
- **Use compression** for final video files

## 🛠️ Testing Checklist

Before deployment, verify:

- [ ] Can update all allowed fields without errors
- [ ] Cannot update forbidden fields (should fail)
- [ ] Status transitions work correctly
- [ ] Final file upload triggers transcription
- [ ] Error handling updates work properly
- [ ] Progress updates display correctly
- [ ] Chunk cleanup works after final upload

## 📞 Support

For integration issues or questions:
- Check Firebase console for detailed error messages
- Verify Firestore security rule violations in console
- Test with individual field updates to isolate issues
- Contact Love Retold team with specific error codes and session IDs

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Compatible with**: Love Retold Firebase Functions v2024.12