/**
 * submissionHandlers.js
 * ---------------------
 * Utility functions for handling recording submission flow.
 * Moved from components/SubmissionHandler.jsx for better architecture.
 */

import { uploadRecording } from '../services/localRecordingService';

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

      // Pass the actual mimeType to uploadRecording so we set proper metadata
      const result = await uploadRecording(
        recordedBlob,
        fileName,
        captureMode,
        (fraction) => dispatch({ type: APP_ACTIONS.SET_UPLOAD_FRACTION, payload: fraction }),
        actualMimeType
      );

      // If successful, we have docId and downloadURL
      dispatch({ type: APP_ACTIONS.SET_DOC_ID, payload: result.docId });
      dispatch({ type: APP_ACTIONS.SET_UPLOAD_IN_PROGRESS, payload: false });
      dispatch({ type: APP_ACTIONS.SET_SHOW_CONFETTI, payload: true });
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Something went wrong during upload.');
      dispatch({ type: APP_ACTIONS.SET_UPLOAD_IN_PROGRESS, payload: false });
    }
  };

  return handleSubmit;
}