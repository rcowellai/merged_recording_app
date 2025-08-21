/**
 * Love Retold Upload Integration
 * =============================
 * Migrated from MVPAPP - Working Love Retold recording upload integration
 * Uses proper sessionId, userId, and storage paths that Love Retold expects
 */

import { ref, uploadBytesResumable } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from './index.js';
// UID-FIX-SLICE-A: Removed generateStoragePaths import - using direct path construction with full userId

// Debug Firebase imports
console.log('🔥 Firebase imports check:', {
  hasRef: typeof ref === 'function',
  hasUploadBytesResumable: typeof uploadBytesResumable === 'function',
  hasDoc: typeof doc === 'function',
  hasUpdateDoc: typeof updateDoc === 'function',
  hasStorage: !!storage,
  hasDb: !!db,
  // UID-FIX-SLICE-A: Removed generateStoragePaths check - using direct path construction
});

/**
 * Get the best supported MIME type for recording
 * @param {string} mediaType - 'audio' or 'video' 
 * @returns {string} Best supported MIME type
 */
const getBestSupportedMimeType = (mediaType = 'audio') => {
  const codecStrategy = {
    audio: [
      'audio/mp4;codecs=mp4a.40.2', // AAC-LC in MP4 - best compatibility
      'audio/mp4', // Fallback MP4
      'audio/webm;codecs=opus', // Legacy fallback
      'audio/webm'
    ],
    video: [
      'video/mp4;codecs=h264', // H.264 in MP4 - best compatibility  
      'video/mp4', // Fallback MP4
      'video/webm;codecs=vp8', // Legacy fallback
      'video/webm'
    ]
  };
  
  const codecs = codecStrategy[mediaType];
  
  for (const mimeType of codecs) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      console.log(`Selected codec for ${mediaType}:`, mimeType);
      return mimeType;
    }
  }
  
  // Fallback to default if nothing is supported (shouldn't happen in modern browsers)
  console.warn(`No supported codec found for ${mediaType}, using default`);
  return mediaType === 'video' ? 'video/webm' : 'audio/webm';
};

/**
 * Love Retold recording upload with proper storage paths and session updates
 * @param {Blob} recordingBlob - Recording blob to upload
 * @param {string} sessionId - Love Retold session ID (full format)
 * @param {Object} sessionComponents - Parsed session components from parseSessionId
 * @param {Object} sessionData - Full session data from validated session // UID-FIX-SLICE-A
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadLoveRetoldRecording = async (recordingBlob, sessionId, sessionComponents, sessionData, options = {}) => {
  console.log('🎙️ LOVE RETOLD UPLOAD SERVICE STARTED');
  console.log('📋 Input validation:', {
    hasRecordingBlob: !!recordingBlob,
    blobSize: recordingBlob?.size,
    blobType: recordingBlob?.type,
    hasSessionId: !!sessionId,
    sessionId,
    hasSessionComponents: !!sessionComponents,
    sessionComponents,
    hasSessionData: !!sessionData, // UID-FIX-SLICE-A
    sessionData, // UID-FIX-SLICE-A
    hasOptions: !!options,
    options
  });

  try {
    const {
      mediaType = 'audio',
      actualMimeType = getBestSupportedMimeType(mediaType),
      onProgress = () => {},
      maxRetries = 3
    } = options;

    console.log('🔧 Upload configuration:', {
      mediaType,
      actualMimeType,
      maxRetries,
      hasOnProgress: typeof onProgress === 'function'
    });

    console.log('🎙️ Love Retold Upload Started:', {
      sessionId,
      userId: sessionComponents?.userId,
      mediaType,
      fileSize: recordingBlob.size
    });

    // UID-FIX-SLICE-A: Use full userId from Firestore session document
    const fullUserId = sessionData?.fullUserId || sessionComponents.userId;
    const fileExtension = actualMimeType.includes('webm') ? 'webm' : 'mp4';
    const finalPath = `users/${fullUserId}/recordings/${sessionId}/final/recording.${fileExtension}`;
    
    // UID-FIX-SLICE-A: Debug logging for validation
    console.log('🔍 Storage Path Debug (UID-FIX-SLICE-A):', {
      sessionComponentsUserId: sessionComponents.userId,
      sessionDataFullUserId: sessionData?.fullUserId,
      finalUserId: fullUserId,
      finalStoragePath: finalPath,
      userIdLengthComparison: {
        truncated: sessionComponents.userId?.length,
        full: sessionData?.fullUserId?.length
      },
      isUsingFullUserId: fullUserId === sessionData?.fullUserId
    });
    
    console.log('📁 Storage path generation complete:', {
      finalPath,
      fileExtension,
      fullUserId
    });
    
    console.log('🔗 Creating Firebase storage reference...');
    const storageRef = ref(storage, finalPath);
    console.log('✅ Storage reference created');
    
    const metadata = {
      contentType: actualMimeType,
      customMetadata: {
        sessionId: sessionId,
        userId: fullUserId, // UID-FIX-SLICE-A: Use full userId in metadata
        promptId: sessionComponents.promptId,
        storytellerId: sessionComponents.storytellerId,
        recordingType: mediaType,
        timestamp: Date.now().toString(),
        recordingVersion: '2.1-love-retold-uiapp'
      }
    };
    
    console.log('📋 Upload metadata prepared:', metadata);

    // Update session status to uploading (preserves MVPAPP logic)
    console.log('📊 Updating session document status...');
    try {
      await updateDoc(doc(db, 'recordingSessions', sessionId), {
        status: 'uploading',
        recordingData: {
          fileSize: recordingBlob.size,
          mimeType: recordingBlob.type,
          uploadStartedAt: new Date()
        }
      });
      console.log('✅ Session status updated to uploading');
    } catch (updateError) {
      console.error('❌ Failed to update session status:', updateError);
      console.warn('⚠️ Failed to update session status:', updateError);
      // Continue with upload even if status update fails
    }

    // Upload with retry logic (preserves MVPAPP retry strategy)
    console.log('🔄 Starting upload with retry logic...');
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      console.log(`🚀 Upload attempt ${attempt + 1}/${maxRetries}`);
      try {
        console.log('📤 Creating upload task...');
        const uploadTask = uploadBytesResumable(storageRef, recordingBlob, metadata);
        console.log('✅ Upload task created, starting upload...');
        
        const result = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress(Math.round(progress));
              
              // Update session progress every 10% (preserves MVPAPP logic)
              if (Math.round(progress) % 10 === 0) {
                updateDoc(doc(db, 'recordingSessions', sessionId), {
                  'recordingData.uploadProgress': Math.round(progress),
                  'recordingData.lastUpdated': new Date()
                }).catch(err => console.warn('Progress update failed:', err));
              }
            },
            (error) => {
              console.error(`Upload attempt ${attempt + 1} failed:`, error);
              reject(error);
            },
            () => {
              console.log('✅ Love Retold upload completed successfully');
              resolve(finalPath);
            }
          );
        });

        // Update session with final storage path (preserves MVPAPP final update)
        await updateDoc(doc(db, 'recordingSessions', sessionId), {
          status: 'processing',
          storagePaths: {
            finalVideo: finalPath
          },
          recordingData: {
            uploadProgress: 100,
            uploadCompletedAt: new Date()
          },
          recordingCompletedAt: new Date()
        });

        console.log('📊 Session updated with final storage path');
        
        return {
          success: true,
          storagePath: finalPath,
          sessionId: sessionId,
          userId: fullUserId // UID-FIX-SLICE-A: Return full userId
        };

      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          console.log(`Upload attempt ${attempt + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        }
      }
    }
    
    // Mark session as failed if all attempts fail (preserves MVPAPP error handling)
    try {
      await updateDoc(doc(db, 'recordingSessions', sessionId), {
        status: 'failed',
        error: {
          code: 'UPLOAD_FAILED',
          message: lastError.message,
          timestamp: new Date(),
          retryable: true,
          retryCount: maxRetries
        }
      });
    } catch (updateError) {
      console.warn('Failed to update session error status:', updateError);
    }
    
    throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError.message}`);
    
  } catch (error) {
    console.error('Error in Love Retold upload:', {
      error,
      errorCode: error?.code,
      errorMessage: error?.message,
      sessionId
    });
    
    // Enhanced error handling (preserves MVPAPP error mapping)
    if (error.code === 'storage/unauthorized') {
      throw new Error('Authentication failed. Please refresh the page and try again.');
    } else if (error.code === 'storage/quota-exceeded') {
      throw new Error('Storage quota exceeded. Please try again later or contact support.');
    } else if (error.code === 'storage/invalid-format') {
      throw new Error('Invalid file format. Please try recording again.');
    } else if (error.code === 'storage/retry-limit-exceeded') {
      throw new Error('Upload failed after multiple attempts. Please check your connection and try again.');
    } else if (error.code && error.code.startsWith('storage/')) {
      throw new Error(`Upload failed: ${error.message || 'Storage error occurred'}`);
    } else if (error.message && error.message.includes('Firebase')) {
      throw new Error(`Firebase error: ${error.message}`);
    } else if (error.message && error.message.includes('auth')) {
      throw new Error('Authentication error. Please refresh the page and try again.');
    } else if (error.message && error.message.includes('network')) {
      throw new Error('Network error. Please check your connection and try again.');
    } else {
      const errorDetail = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Upload failed: ${errorDetail}. Please check browser console for details.`);
    }
  }
};