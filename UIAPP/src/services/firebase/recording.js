/**
 * Firebase Recording Upload Service (C06)
 * 
 * Firebase recording upload service with chunked uploads, metadata persistence,
 * and session integration. Builds on C05 storage foundation with recording-specific
 * features following MVPAPP patterns.
 */

import { 
  uploadMemoryRecording, 
  linkStorageToFirestore,
  deleteFile 
} from './storage.js';
import { 
  createRecordingSession,
  updateRecordingSession,
  getRecordingSession 
} from './firestore.js';
import { createError, UPLOAD_ERRORS } from '../../utils/errors.js';
import { ENV_CONFIG } from '../../config/index.js';

/**
 * Generate recording storage path following MVPAPP conventions
 * @param {string} sessionId - Recording session ID
 * @param {string} userId - User ID
 * @param {string} fileExtension - File extension
 * @returns {string} Storage path
 */
function generateRecordingStoragePath(sessionId, userId, fileExtension = 'mp4') {
  const timestamp = Date.now();
  return `users/${userId}/recordings/${sessionId}/${timestamp}_recording.${fileExtension}`;
}

/**
 * Create RecordingMetadata object from upload parameters
 * @param {Object} params - Recording parameters
 * @returns {Object} RecordingMetadata
 */
function createRecordingMetadata({
  sessionId,
  userId,
  fileType,
  mimeType,
  duration,
  size,
  storagePath,
  downloadUrl
}) {
  return {
    sessionId,
    userId,
    fileType: fileType || 'audio',
    mimeType: mimeType || 'audio/mp4',
    duration: duration || 0,
    createdAt: new Date(),
    size: size || 0,
    storagePaths: {
      chunks: [], // C05 handles chunking internally
      final: storagePath,
      thumbnail: null
    },
    downloadUrl,
    uploadVersion: '2.1-uiapp-c06',
    uploadSource: 'recording-service'
  };
}

/**
 * Upload recording with metadata persistence
 * @param {Blob} blob - Recording blob
 * @param {Object} sessionInfo - Recording session information
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} UploadResult
 */
export async function uploadRecordingWithMetadata(blob, sessionInfo, options = {}) {
  try {
    const {
      sessionId = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId = 'anonymous',
      fileType = 'audio',
      fileName = 'recording',
      duration = 0,
      onProgress = () => {},
      onChunkUploaded = () => {},
      maxRetries = 3,
      linkToFirestore = true
    } = { ...sessionInfo, ...options };

    console.log('🎙️ C06 Recording Upload Started:', {
      sessionId,
      userId,
      fileType,
      size: blob.size
    });

    // Create recording session in Firestore
    const sessionData = {
      sessionId,
      userId,
      status: 'Uploading',
      fileType,
      fileSize: blob.size,
      mimeType: blob.type,
      duration,
      createdAt: new Date(),
      uploadProgress: 0
    };

    if (linkToFirestore) {
      try {
        await createRecordingSession(sessionId, sessionData);
        console.log('📊 Recording session created in Firestore');
      } catch (sessionError) {
        console.warn('⚠️ Failed to create recording session, continuing with upload:', sessionError);
      }
    }

    // Enhance progress callback to update Firestore
    const enhancedProgressCallback = async (progress) => {
      onProgress(progress);
      
      if (linkToFirestore && progress % 0.1 === 0) { // Update every 10%
        try {
          await updateRecordingSession(sessionId, {
            uploadProgress: Math.round(progress * 100),
            lastUpdated: new Date()
          });
        } catch (progressError) {
          console.warn('⚠️ Failed to update upload progress:', progressError);
        }
      }
    };

    // Use C05 uploadMemoryRecording for actual upload
    const uploadResult = await uploadMemoryRecording(
      blob,
      userId,
      sessionId,
      {
        mediaType: fileType,
        fileName,
        duration,
        onProgress: enhancedProgressCallback,
        linkToFirestore: false, // We handle Firestore linking ourselves
        maxRetries
      }
    );

    console.log('✅ C05 Upload completed:', uploadResult);

    // Create recording metadata
    const recordingMetadata = createRecordingMetadata({
      sessionId,
      userId,
      fileType,
      mimeType: blob.type,
      duration,
      size: blob.size,
      storagePath: uploadResult.storagePath,
      downloadUrl: uploadResult.downloadURL
    });

    // Persist metadata to Firestore
    if (linkToFirestore) {
      try {
        await updateRecordingSession(sessionId, {
          status: 'ReadyForTranscription',
          storagePath: uploadResult.storagePath,
          downloadUrl: uploadResult.downloadURL,
          metadata: recordingMetadata,
          uploadProgress: 100,
          completedAt: new Date()
        });
        console.log('📊 Recording metadata persisted to Firestore');
      } catch (metadataError) {
        console.warn('⚠️ Failed to persist metadata, upload still successful:', metadataError);
      }
    }

    // Return UploadResult format
    return {
      success: true,
      recordingId: sessionId,
      downloadUrl: uploadResult.downloadURL,
      storagePath: uploadResult.storagePath,
      metadata: recordingMetadata,
      uploadId: uploadResult.uploadId
    };

  } catch (error) {
    console.error('❌ C06 Recording upload failed:', error);

    // Update session status to failed if possible
    if (options.linkToFirestore !== false && sessionInfo?.sessionId) {
      try {
        await updateRecordingSession(sessionInfo.sessionId, {
          status: 'failed',
          error: {
            code: 'UPLOAD_FAILED',
            message: error.message,
            timestamp: new Date()
          }
        });
      } catch (updateError) {
        console.warn('⚠️ Failed to update session error status:', updateError);
      }
    }

    // Map error to UploadResult format
    return {
      success: false,
      recordingId: sessionInfo?.sessionId || null,
      downloadUrl: null,
      storagePath: null,
      error: error.message || 'Recording upload failed'
    };
  }
}

/**
 * Resume interrupted recording upload
 * @param {string} uploadId - Upload ID to resume
 * @returns {Promise<Object>} UploadResult
 */
export async function resumeRecordingUpload(uploadId) {
  try {
    console.log('🔄 Resuming recording upload:', uploadId);

    // Try to get session data from Firestore
    const sessionData = await getRecordingSession(uploadId);
    
    if (!sessionData) {
      throw createError(
        UPLOAD_ERRORS.NOT_FOUND,
        `Recording session not found: ${uploadId}`
      );
    }

    if (sessionData.status === 'ReadyForTranscription') {
      console.log('✅ Recording upload already completed');
      return {
        success: true,
        recordingId: uploadId,
        downloadUrl: sessionData.downloadUrl,
        storagePath: sessionData.storagePath
      };
    }

    if (sessionData.status !== 'Uploading' && sessionData.status !== 'failed') {
      throw createError(
        UPLOAD_ERRORS.INVALID_STATE,
        `Cannot resume upload in status: ${sessionData.status}`
      );
    }

    // For now, resumption requires re-upload since C05 doesn't support partial uploads
    console.warn('⚠️ Resume not fully implemented - partial uploads not supported by C05');
    
    return {
      success: false,
      recordingId: uploadId,
      error: 'Resume functionality requires re-upload - partial uploads not yet supported'
    };

  } catch (error) {
    console.error('❌ Failed to resume recording upload:', error);
    return {
      success: false,
      recordingId: uploadId,
      error: error?.message || error?.toString() || 'Failed to resume upload'
    };
  }
}

/**
 * Cancel recording upload
 * @param {string} uploadId - Upload ID to cancel
 * @returns {Promise<boolean>} Success status
 */
export async function cancelRecordingUpload(uploadId) {
  try {
    console.log('🛑 Cancelling recording upload:', uploadId);

    // Get session data to determine storage path
    const sessionData = await getRecordingSession(uploadId);
    
    if (sessionData?.storagePath) {
      try {
        await deleteFile(sessionData.storagePath, {
          cleanupFirestore: false // We'll update the session status separately
        });
        console.log('🗑️ Storage file deleted');
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete storage file:', deleteError);
      }
    }

    // Update session status to cancelled
    await updateRecordingSession(uploadId, {
      status: 'cancelled',
      cancelledAt: new Date()
    });

    console.log('✅ Recording upload cancelled successfully');
    return true;

  } catch (error) {
    console.error('❌ Failed to cancel recording upload:', error);
    return false;
  }
}

/**
 * Get recording upload progress
 * @param {string} uploadId - Upload ID
 * @returns {Promise<Object>} Progress information
 */
export async function getRecordingUploadProgress(uploadId) {
  try {
    const sessionData = await getRecordingSession(uploadId);
    
    if (!sessionData) {
      return {
        found: false,
        uploadId,
        progress: 0,
        status: 'not_found'
      };
    }

    return {
      found: true,
      uploadId,
      progress: sessionData.uploadProgress || 0,
      status: sessionData.status,
      recordingId: sessionData.sessionId,
      downloadUrl: sessionData.downloadUrl,
      storagePath: sessionData.storagePath,
      lastUpdated: sessionData.lastUpdated
    };

  } catch (error) {
    console.error('❌ Failed to get recording upload progress:', error);
    return {
      found: false,
      uploadId,
      progress: 0,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Check if Firebase recording upload is enabled
 * @returns {boolean} Whether Firebase recording upload is enabled
 */
export function isRecordingUploadEnabled() {
  return !!(
    ENV_CONFIG.USE_FIREBASE && 
    ENV_CONFIG.FIREBASE_STORAGE_ENABLED &&
    ENV_CONFIG.RECORDING_UPLOAD_ENABLED !== false
  );
}

/**
 * Validate recording upload parameters
 * @param {Blob} blob - Recording blob
 * @param {Object} sessionInfo - Session information
 * @returns {Object} Validation result
 */
export function validateRecordingUpload(blob, sessionInfo) {
  const validation = {
    isValid: true,
    errors: []
  };

  if (!blob || !(blob instanceof Blob)) {
    validation.isValid = false;
    validation.errors.push('Invalid blob: must be a Blob object');
  }

  if (blob?.size === 0) {
    validation.isValid = false;
    validation.errors.push('Invalid blob: blob is empty');
  }

  if (!sessionInfo || typeof sessionInfo !== 'object') {
    validation.isValid = false;
    validation.errors.push('Invalid sessionInfo: must be an object');
  }

  if (sessionInfo?.fileType && !['audio', 'video'].includes(sessionInfo.fileType)) {
    validation.isValid = false;
    validation.errors.push('Invalid fileType: must be "audio" or "video"');
  }

  if (sessionInfo?.duration && (typeof sessionInfo.duration !== 'number' || sessionInfo.duration < 0)) {
    validation.isValid = false;
    validation.errors.push('Invalid duration: must be a non-negative number');
  }

  return validation;
}

console.log('🎙️ Firebase Recording Upload Service (C06): LOADED');
console.log('📦 Features: chunked uploads, metadata persistence, session integration');