/**
 * submissionHandlers.js
 * ---------------------
 * Utility functions for handling recording submission flow.
 * Enhanced with Firebase storage support (C05) and recording service (C06).
 * Moved from components/SubmissionHandler.jsx for better architecture.
 */

// Import both storage services for conditional usage
import { uploadRecording as uploadRecordingLocal } from '../services/localRecordingService';
import { 
  uploadMemoryRecording, 
  uploadRecording as uploadRecordingFirebase,
  uploadRecordingWithMetadata,
  isRecordingUploadEnabled
} from '../services/firebase';

// Import configuration to check Firebase enablement
import { ENV_CONFIG } from '../config';
import { firebaseErrorHandler } from './firebaseErrorHandler';

/**
 * Creates a submission handler function
 * @param {Object} params - Submission parameters
 * @returns {Function} handleSubmit function
 */
export function createSubmissionHandler({
  recordedBlobUrl,
  captureMode, 
  actualMimeType,
  appState,
  dispatch,
  APP_ACTIONS
}) {
  
  // Handle submit (preserves exact logic from App.js:113-177)
  const handleSubmit = async () => {
    try {
      if (!recordedBlobUrl) {
        console.warn('No recorded blob URL found.');
        return;
      }

      // Convert the object URL => Blob
      const response = await fetch(recordedBlobUrl);
      const recordedBlob = await response.blob();

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

      dispatch({ type: APP_ACTIONS.SET_UPLOAD_IN_PROGRESS, payload: true });
      dispatch({ type: APP_ACTIONS.SET_UPLOAD_FRACTION, payload: 0 });

      // C08: Upload with Firebase and automatic localStorage fallback
      const result = await firebaseErrorHandler.withFirebaseFallback(
        // Firebase operation
        async () => {
          firebaseErrorHandler.log('info', 'Starting Firebase upload', {
            fileName,
            captureMode,
            fileSize: recordedBlob.size
          }, {
            service: 'recording-upload',
            operation: 'firebase-upload'
          });
          
          // Use C06 recording upload service if available, otherwise fallback to C05
          if (isRecordingUploadEnabled()) {
            firebaseErrorHandler.log('debug', 'Using C06 Recording Upload Service', null, {
              service: 'recording-upload',
              operation: 'c06-upload'
            });
            
            // Generate session info for recording service
            const sessionId = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const userId = 'anonymous'; // Could be enhanced to use actual user ID
            
            const sessionInfo = {
              sessionId,
              userId,
              fileType: captureMode,
              fileName: fileName.replace(/\.[^/.]+$/, ''), // Remove extension for Firebase naming
              duration: 0 // Could be enhanced to track actual duration
            };
            
            // Use C06 uploadRecordingWithMetadata function with retry
            const uploadResult = await uploadRecordingWithMetadata(
              recordedBlob,
              sessionInfo,
              {
                onProgress: (progress) => dispatch({ type: APP_ACTIONS.SET_UPLOAD_FRACTION, payload: progress }),
                linkToFirestore: true
              }
            );
            
            if (uploadResult.success) {
              return {
                docId: uploadResult.recordingId,
                downloadURL: uploadResult.downloadUrl,
                storagePath: uploadResult.storagePath
              };
            } else {
              throw new Error(uploadResult.error || 'Recording upload failed');
            }
            
          } else {
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
      const mappedError = firebaseErrorHandler.mapError(error, 'recording-upload');
      
      firebaseErrorHandler.log('error', 'Upload failed after all retry attempts', mappedError, {
        service: 'recording-upload',
        operation: 'final-error'
      });
      
      // Show user-friendly error message
      alert(mappedError.message || 'Something went wrong during upload. Please try again.');
      dispatch({ type: APP_ACTIONS.SET_UPLOAD_IN_PROGRESS, payload: false });
    }
  };

  return handleSubmit;
}