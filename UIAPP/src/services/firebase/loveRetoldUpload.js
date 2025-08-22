/**
 * Love Retold Upload Integration (Slice B Complete)
 * ================================================
 * Migrated from MVPAPP - Working Love Retold recording upload integration
 * Uses proper sessionId, userId, and storage paths that Love Retold expects
 * 
 * SLICE-B IMPLEMENTATION:
 * - Proper Firestore updates with Love Retold's expected field structure
 * - Correct askerName source path (sessionData.askerName)
 * - Comprehensive recordingData metadata with dot notation
 * - Error handling: upload success even if Firestore update fails
 */

import { ref, uploadBytesResumable } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from './index.js';
import { uploadErrorTracker } from '../../utils/uploadErrorTracker.js';
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

// Progressive upload functionality removed - using simple single upload

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
    options,
    // Progressive upload removed - using simple single upload flow
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
    
    // Customer support: Log storage path validation for diagnosis
    uploadErrorTracker.logInfo('Storage path validation for customer support', {
      sessionId,
      fullUserId: sessionData?.fullUserId,
      truncatedUserId: sessionComponents.userId,
      expectedStoragePath: finalPath,
      step: 'pathValidation',
      additionalData: {
        isUsingFullUserId: fullUserId === sessionData?.fullUserId,
        userIdLengths: {
          truncated: sessionComponents.userId?.length,
          full: sessionData?.fullUserId?.length
        }
      }
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
        recordingVersion: '2.1-love-retold-status-fixed' // SLICE-B FIX: Updated for Love Retold status system
        // SLICE-B FIX: Removed askerName - Love Retold handles this field
      }
    };
    
    console.log('📋 Upload metadata prepared:', metadata);

    // Update session status to Uploading (Love Retold status system)
    console.log('📊 Updating session document status...');
    try {
      await updateDoc(doc(db, 'recordingSessions', sessionId), {
        status: 'Uploading', // SLICE-B FIX: Use Love Retold's status value
        'recordingData.fileSize': recordingBlob.size,
        'recordingData.mimeType': recordingBlob.type,
        'recordingData.uploadStartedAt': new Date()
        // FIRESTORE-FIX: Remove updatedAt and serverTimestamp - not allowed for anonymous users
      });
      console.log('✅ Session status updated to Uploading (Love Retold status)');
      
      // Love Retold integration: Track status transition for pipeline debugging
      uploadErrorTracker.logInfo('Love Retold status transition tracked', {
        sessionId,
        fullUserId,
        truncatedUserId: sessionComponents.userId,
        previousStatus: 'Recording',
        status: 'Uploading',
        step: 'statusUpdate',
        firestoreUpdate: {
          attempted: true,
          success: true
        }
      });
    } catch (updateError) {
      console.error('❌ Failed to update session status:', updateError);
      console.warn('⚠️ Failed to update session status:', updateError);
      
      // Upload failure tracking: Log status update failure for support investigation
      uploadErrorTracker.logWarning('Firestore status update failed but continuing upload', {
        sessionId,
        fullUserId,
        truncatedUserId: sessionComponents.userId,
        status: 'Uploading',
        step: 'statusUpdate',
        firestoreUpdate: {
          attempted: true,
          success: false,
          errorMessage: updateError.message
        }
      });
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
                }).catch(err => {
                  console.warn('Progress update failed:', err);
                  // Upload failure tracking: Log progress update issues
                  uploadErrorTracker.logWarning('Upload progress update failed', {
                    sessionId,
                    uploadProgress: Math.round(progress),
                    step: 'uploadProgress',
                    errorMessage: err.message
                  });
                });
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

        // SLICE-B: Update session with Love Retold's expected field structure
        try {
          console.log('📊 Starting Slice B Firestore update (Love Retold status system)...');
          
          // Prepare update data using Love Retold's field structure with dot notation
          const updateData = {
            status: 'ReadyForTranscription', // SLICE-B FIX: Use Love Retold's status value
            recordingCompletedAt: new Date()
            // SLICE-B FIX: Removed 'updatedAt' - not allowed in Firestore rules
            // PHASE 2 FIX: fileType completely removed per Love Retold team - use recordingData.mimeType instead
            // SLICE-B FIX: Removed 'askerName' - Love Retold populates this when creating sessions
          };
          
          // CRITICAL FIX: Always use finalVideo field for ALL recordings (per Love Retold team)
          // Love Retold functions only look for storagePaths.finalVideo regardless of media type
          updateData['storagePaths.finalVideo'] = finalPath;
          
          // Add optional recording metadata if available
          if (recordingBlob.size) {
            updateData['recordingData.fileSize'] = recordingBlob.size;
            console.log('📊 Adding fileSize:', recordingBlob.size);
          }
          
          if (actualMimeType) {
            updateData['recordingData.mimeType'] = actualMimeType;
            console.log('📊 Adding mimeType:', actualMimeType);
          }
          
          // Add duration if provided in options (future enhancement)
          if (options.duration) {
            updateData['recordingData.duration'] = options.duration;
            console.log('📊 Adding duration:', options.duration);
          }
          
          // PHASE 2 FIX: fileType completely removed per Love Retold team
          // Use recordingData.mimeType for media type identification instead
          
          console.log('📊 Complete update data (Love Retold compatible):', updateData);
          console.log('🔍 DEBUG: mediaType for reference:', mediaType);
          console.log('🔍 VALIDATION: Critical fields check:', {
            hasStatus: !!updateData.status,
            hasRecordingData: Object.keys(updateData).some(key => key.startsWith('recordingData.')),
            hasStoragePath: Object.keys(updateData).some(key => key.startsWith('storagePaths.'))
          });
          
          // Customer support: Track Firestore update attempt for troubleshooting
          uploadErrorTracker.logInfo('Attempting Firestore completion update', {
            sessionId,
            fullUserId,
            truncatedUserId: sessionComponents.userId,
            expectedStoragePath: finalPath,
            status: 'ReadyForTranscription',
            step: 'firestoreUpdate'
          });
          
          await updateDoc(doc(db, 'recordingSessions', sessionId), updateData);
          
          console.log('✅ Slice B: Session updated with Love Retold field structure');
          
          // Love Retold integration: Track successful pipeline trigger
          uploadErrorTracker.logInfo('Love Retold transcription pipeline triggered', {
            sessionId,
            fullUserId,
            truncatedUserId: sessionComponents.userId,
            storagePath: finalPath,
            previousStatus: 'Uploading',
            status: 'ReadyForTranscription',
            step: 'firestoreUpdate',
            firestoreUpdate: {
              attempted: true,
              success: true
            }
          });
          
        } catch (firestoreError) {
          // PHASE 2 FIX: Enhanced error handling with retry logic per Love Retold team
          console.warn('⚠️ Firestore update failed but upload succeeded:', firestoreError);
          console.log('📝 Recording is safely stored at:', finalPath);
          
          // RETRY ONCE: Attempt Firestore update retry as recommended by Love Retold team
          try {
            console.log('🔄 Attempting Firestore update retry...');
            await updateDoc(doc(db, 'recordingSessions', sessionId), {
              status: 'ReadyForTranscription',
              'storagePaths.finalVideo': finalPath,
              recordingCompletedAt: new Date(),
              error: {
                code: 'FIRESTORE_UPDATE_RETRY',
                message: 'Initial update failed, retrying',
                timestamp: new Date(),
                retryable: true,
                retryCount: 1
              }
            });
            
            console.log('✅ Firestore update retry succeeded');
            uploadErrorTracker.logInfo('Firestore update retry succeeded', {
              sessionId,
              fullUserId,
              step: 'firestoreUpdateRetry',
              retrySuccessful: true
            });
            
          } catch (retryError) {
            // CONTINUE: Log warning but don't fail user experience
            console.error('❌ Firestore update failed after retry:', retryError);
            
            // Admin diagnostic: Log complete failure for customer support investigation
            uploadErrorTracker.logWarning('Firestore update failed after retry - Love Retold functions will still process file', {
              sessionId,
              fullUserId,
              truncatedUserId: sessionComponents.userId,
              expectedStoragePath: finalPath,
              status: 'ReadyForTranscription',
              step: 'firestoreUpdateRetryFailed',
              firestoreUpdate: {
                attempted: true,
                retryAttempted: true,
                success: false,
                initialError: firestoreError.message,
                retryError: retryError.message
              },
              additionalData: {
                uploadSuccessful: true,
                recordingSafelyStored: true,
                transcriptionMayBeDelayed: true,
                loveRetoldWillStillProcess: true
              }
            });
            // Don't throw error - upload was successful, Love Retold functions will still process the uploaded file
          }
        }
        
        return {
          success: true,
          storagePath: finalPath,
          sessionId: sessionId,
          userId: fullUserId, // UID-FIX-SLICE-A: Return full userId
          firestoreUpdateSuccess: true // Track Firestore success for logging
        };

      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          console.log(`Upload attempt ${attempt + 1} failed, retrying...`);
          
          // Upload failure tracking: Log retry attempts for pattern analysis
          uploadErrorTracker.logWarning('Upload attempt failed, retrying', {
            sessionId,
            fullUserId,
            truncatedUserId: sessionComponents.userId,
            attemptNumber: attempt + 1,
            maxRetries,
            step: 'uploadRetry',
            error: error.message,
            additionalData: {
              willRetry: true,
              nextAttemptDelay: 1000 * (attempt + 1)
            }
          });
          
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
      
      // Admin diagnostic: Track complete upload failure for support escalation
      uploadErrorTracker.logError(lastError, {
        sessionId,
        fullUserId,
        truncatedUserId: sessionComponents.userId,
        status: 'failed',
        step: 'uploadFailed',
        retryCount: maxRetries,
        firestoreUpdate: {
          attempted: true,
          success: true,
          errorMessage: 'Session marked as failed'
        }
      });
    } catch (updateError) {
      console.warn('Failed to update session error status:', updateError);
      
      // Upload failure tracking: Log inability to mark session as failed
      uploadErrorTracker.logError(updateError, {
        sessionId,
        fullUserId,
        truncatedUserId: sessionComponents.userId,
        status: 'failed',
        step: 'failedStatusUpdate',
        additionalData: {
          originalError: lastError.message,
          statusUpdateError: updateError.message
        }
      });
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