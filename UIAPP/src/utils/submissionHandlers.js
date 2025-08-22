/**
 * submissionHandlers.js
 * ---------------------
 * Utility functions for handling recording submission flow.
 * Enhanced with Firebase storage support (C05) and recording service (C06).
 * Moved from components/SubmissionHandler.jsx for better architecture.
 */

// Import both storage services for conditional usage
import { uploadRecording as uploadRecordingLocal } from '../services/localRecordingService';
import { uploadMemoryRecording } from '../services/firebase';

// Import configuration to check Firebase enablement
import { firebaseErrorHandler } from './firebaseErrorHandler';

// Import Love Retold integration functions
// UID-FIX-SLICE-A: Removed generateStoragePaths import - using direct path construction in loveRetoldUpload.js
import { uploadLoveRetoldRecording } from '../services/firebase/loveRetoldUpload.js';

// Import debug utilities
import { logUploadStep, addDebugLog } from './uploadDebugger.js';
import { uploadErrorTracker } from './uploadErrorTracker.js';

/**
 * Creates a submission handler function
 * @param {Object} params - Submission parameters
 * @returns {Function} handleSubmit function
 */
export function createSubmissionHandler({
  recordedBlobUrl,
  captureMode, 
  actualMimeType,
  sessionId,          // NEW: Add sessionId 
  sessionComponents,  // NEW: Add sessionComponents
  sessionData,        // UID-FIX-SLICE-A: Add sessionData for full userId
  // progressiveUpload removed - using simple upload flow
  appState,
  dispatch,
  APP_ACTIONS
}) {
  
  // Handle submit (preserves exact logic from App.js:113-177)
  const handleSubmit = async () => {
    logUploadStep('UPLOAD STARTED', 'start');
    console.log('🚀 SUBMIT HANDLER STARTED');
    
    // Customer support: Track upload initiation for troubleshooting
    uploadErrorTracker.logInfo('Upload initiated', {
      sessionId,
      fullUserId: sessionData?.fullUserId,
      truncatedUserId: sessionComponents?.userId,
      step: 'recordingStart',
      status: sessionData?.sessionDocument?.status
    });
    
    const debugInfo = {
      hasRecordedBlobUrl: !!recordedBlobUrl,
      captureMode,
      actualMimeType,
      hasSessionId: !!sessionId,
      hasSessionComponents: !!sessionComponents,
      hasSessionData: !!sessionData, // UID-FIX-SLICE-A
      sessionId,
      sessionComponents,
      sessionData // UID-FIX-SLICE-A
    };
    
    console.log('📊 Submit Handler Debug Info:', debugInfo);
    addDebugLog('Submit handler initialized', debugInfo);

    try {
      if (!recordedBlobUrl) {
        console.error('❌ No recorded blob URL found');
        console.warn('No recorded blob URL found.');
        return;
      }

      console.log('✅ Recorded blob URL exists, proceeding with upload');

      // Convert the object URL => Blob
      console.log('📥 Converting blob URL to blob...');
      const response = await fetch(recordedBlobUrl);
      const recordedBlob = await response.blob();
      console.log('✅ Blob conversion successful:', {
        blobSize: recordedBlob.size,
        blobType: recordedBlob.type
      });
      
      // Customer support: Track blob creation for size and format diagnosis
      uploadErrorTracker.logInfo('Recording blob created', {
        sessionId,
        fullUserId: sessionData?.fullUserId,
        truncatedUserId: sessionComponents?.userId,
        step: 'blobCreate',
        fileSize: recordedBlob.size,
        mimeType: recordedBlob.type
      });

      // Create a unique filename (exact same logic as App.js:125-154)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');

      // Determine the correct extension based on mimeType
      let fileExtension;
      if (captureMode === 'video') {
        // If actualMimeType includes 'mp4', we use .mp4, else .webm
        if (actualMimeType?.includes('mp4')) {
          fileExtension = 'mp4';
        } else {
          fileExtension = 'webm';
        }
      } else {
        // Audio
        if (actualMimeType?.includes('mp4')) {
          // We'll use .m4a for AAC-based recordings
          fileExtension = 'm4a';
        } else {
          fileExtension = 'webm';
        }
      }

      const fileName = `${year}-${month}-${day}_${hours}${mins}${secs}_${captureMode}.${fileExtension}`;

      console.log('🔄 Setting upload in progress...');
      dispatch({ type: APP_ACTIONS.SET_UPLOAD_IN_PROGRESS, payload: true });
      dispatch({ type: APP_ACTIONS.SET_UPLOAD_FRACTION, payload: 0 });
      console.log('✅ Upload state initialized');

      // NEW: Love Retold Integration - Use proper sessionId and userId  
      const result = await firebaseErrorHandler.withFallback(
        // Love Retold upload operation
        async () => {
          firebaseErrorHandler.log('info', 'Starting Love Retold upload', {
            fileName,
            captureMode,
            fileSize: recordedBlob.size,
            sessionId: sessionId,
            userId: sessionComponents?.userId
          }, {
            service: 'love-retold-upload',
            operation: 'love-retold-upload'
          });
          
          // Check if we have proper Love Retold session data
          console.log('🔍 Checking Love Retold session data...');
          console.log('Session validation:', {
            hasSessionId: !!sessionId,
            sessionIdValue: sessionId,
            hasSessionComponents: !!sessionComponents,
            sessionComponentsValue: sessionComponents,
            hasUserId: !!(sessionComponents && sessionComponents.userId),
            userIdValue: sessionComponents?.userId
          });

          if (sessionId && sessionComponents && sessionComponents.userId) {
            console.log('✅ Love Retold session data is valid, using Love Retold upload');
            firebaseErrorHandler.log('debug', 'Using Love Retold Upload Service', {
              sessionId,
              userId: sessionComponents.userId,
              promptId: sessionComponents.promptId
            }, {
              service: 'love-retold-upload',
              operation: 'proper-integration'
            });
            
            // Simple upload flow - no progressive upload logic
            // Simple single upload after recording completes
            console.log(`🚀 FINAL UPLOAD: Using simple single upload`);
            
            // Customer support: Track upload start with full context
            uploadErrorTracker.logInfo('Love Retold upload starting', {
              sessionId,
              fullUserId: sessionData?.fullUserId,
              truncatedUserId: sessionComponents?.userId,
              step: 'uploadStart',
              status: 'Uploading',
              fileSize: recordedBlob.size,
              mimeType: actualMimeType
            });
            
            const uploadResult = await uploadLoveRetoldRecording(
              recordedBlob,
              sessionId,
              sessionComponents,
              sessionData, // UID-FIX-SLICE-A: Pass sessionData for full userId
              {
                mediaType: captureMode,
                actualMimeType: actualMimeType,
                onProgress: (progress) => {
                  dispatch({ type: APP_ACTIONS.SET_UPLOAD_FRACTION, payload: progress / 100.0 });
                },
                maxRetries: 3
              }
            );
            
            console.log(`✅ FINAL UPLOAD SUCCESS: Upload completed`);
            
            if (uploadResult.success) {
              // Customer support: Track successful upload completion
              uploadErrorTracker.logInfo('Love Retold upload completed successfully', {
                sessionId,
                fullUserId: sessionData?.fullUserId,
                truncatedUserId: sessionComponents?.userId,
                step: 'uploadFinalize',
                status: 'ReadyForTranscription',
                storagePath: uploadResult.storagePath,
                uploadMethod: uploadResult.uploadMethod || 'simple'
              });
              
              return {
                docId: sessionId, // Use sessionId as docId for Love Retold
                downloadURL: null, // Love Retold handles download URLs internally
                storagePath: uploadResult.storagePath
              };
            } else {
              throw new Error('Love Retold upload failed');
            }
            
          } else {
            console.log('❌ Love Retold session data is invalid, falling back to legacy upload');
            console.log('Fallback reason:', {
              noSessionId: !sessionId,
              noSessionComponents: !sessionComponents,
              noUserId: !(sessionComponents && sessionComponents.userId)
            });
            firebaseErrorHandler.log('debug', 'Using C05 Memory Recording fallback', null, {
              service: 'recording-upload',
              operation: 'c05-upload'
            });
            
            // Generate userId and memoryId for Firebase memory recording
            const userId = 'anonymous'; // Could be enhanced to use actual user ID
            const memoryId = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Use C05 uploadMemoryRecording function
            const uploadResult = await uploadMemoryRecording(
              recordedBlob,
              userId,
              memoryId,
              {
                mediaType: captureMode,
                fileName: fileName.replace(/\.[^/.]+$/, ''), // Remove extension for Firebase naming
                onProgress: (progress) => dispatch({ type: APP_ACTIONS.SET_UPLOAD_FRACTION, payload: progress }),
                linkToFirestore: true
              }
            );
            
            // Map Firebase result to expected format
            return {
              docId: memoryId,
              downloadURL: uploadResult.downloadURL,
              storagePath: uploadResult.storagePath
            };
          }
        },
        // LocalStorage fallback operation
        async () => {
          firebaseErrorHandler.log('info', 'Using localStorage fallback for upload', {
            fileName,
            captureMode
          }, {
            service: 'recording-upload',
            operation: 'localStorage-fallback'
          });
          
          // Use local storage upload (preserves original logic)
          return await uploadRecordingLocal(
            recordedBlob,
            fileName,
            captureMode,
            (fraction) => dispatch({ type: APP_ACTIONS.SET_UPLOAD_FRACTION, payload: fraction }),
            actualMimeType
          );
        },
        { maxRetries: 2 }, // Recording uploads get fewer retries
        'recording-upload'
      );

      // If successful, we have docId and downloadURL
      dispatch({ type: APP_ACTIONS.SET_DOC_ID, payload: result.docId });
      dispatch({ type: APP_ACTIONS.SET_UPLOAD_IN_PROGRESS, payload: false });
      dispatch({ type: APP_ACTIONS.SET_SHOW_CONFETTI, payload: true });
    } catch (error) {
      console.error('💥 UPLOAD HANDLER ERROR:', error);
      console.error('Error details:', {
        errorName: error?.name,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorStack: error?.stack,
        fullError: error
      });
      
      // Admin diagnostic: Capture full error context for customer support resolution
      uploadErrorTracker.logError(error, {
        sessionId,
        fullUserId: sessionData?.fullUserId,
        truncatedUserId: sessionComponents?.userId,
        step: 'submission',
        status: sessionData?.sessionDocument?.status,
        fileSize: null, // recordedBlob not available in catch scope
        mimeType: actualMimeType,
        captureMode,
        additionalData: {
          hasRecordedBlobUrl: !!recordedBlobUrl,
          errorLocation: 'submissionHandler.catch'
        }
      });

      const mappedError = firebaseErrorHandler.mapError(error, 'recording-upload');
      
      console.error('📋 Mapped error details:', mappedError);
      
      firebaseErrorHandler.log('error', 'Upload failed after all retry attempts', mappedError, {
        service: 'recording-upload',
        operation: 'final-error'
      });
      
      // Show user-friendly error message
      console.error('🚨 Showing error to user:', mappedError.message);
      alert(mappedError.message || 'Something went wrong during upload. Please try again.');
      dispatch({ type: APP_ACTIONS.SET_UPLOAD_IN_PROGRESS, payload: false });
    }
  };

  return handleSubmit;
}