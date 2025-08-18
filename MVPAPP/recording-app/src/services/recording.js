import { ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import { storage, initializeAnonymousAuth } from './firebase.js';

/**
 * Get user media with error handling
 * @param {Object} constraints - Media constraints
 * @returns {Promise<MediaStream>} Media stream
 */
export const getUserMedia = async (constraints = { audio: true }) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    
    if (error.name === 'NotAllowedError') {
      throw new Error('Microphone access denied. Please allow microphone access and try again.');
    } else if (error.name === 'NotFoundError') {
      throw new Error('No microphone found. Please connect a microphone and try again.');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Your browser does not support audio recording.');
    } else {
      throw new Error('Unable to access microphone. Please check your device settings.');
    }
  }
};

/**
 * Start recording audio
 * @param {MediaStream} stream - Media stream
 * @param {Function} onDataAvailable - Callback for data chunks
 * @param {Function} onStop - Callback when recording stops
 * @returns {MediaRecorder} Media recorder instance
 */
export const startRecording = (stream, onDataAvailable, onStop) => {
  try {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    const chunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
        if (onDataAvailable) onDataAvailable(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      if (onStop) onStop(blob);
    };
    
    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event.error);
    };
    
    mediaRecorder.start(1000); // Collect data every second
    return mediaRecorder;
  } catch (error) {
    console.error('Error starting recording:', error);
    throw new Error('Unable to start recording. Your browser may not support audio recording.');
  }
};

/**
 * Stop recording and cleanup stream
 * @param {MediaRecorder} mediaRecorder - Media recorder instance
 * @param {MediaStream} stream - Media stream to cleanup
 */
export const stopRecording = (mediaRecorder, stream) => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }
};

/**
 * Upload recording to Firebase Storage
 * @param {string} sessionId - Session ID
 * @param {Blob} audioBlob - Audio blob to upload
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} Download URL
 */
export const uploadRecording = async (sessionId, audioBlob, onProgress = null) => {
  try {
    // Ensure anonymous authentication
    await initializeAnonymousAuth();
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${sessionId}_${timestamp}.webm`;
    const filePath = `recordings/${sessionId}/${filename}`;
    
    // Create storage reference
    const storageRef = ref(storage, filePath);
    
    // Prepare metadata
    const metadata = {
      contentType: 'audio/webm',
      customMetadata: {
        sessionId: sessionId,
        recordingType: 'audio',
        timestamp: timestamp.toString(),
        originalFilename: filename
      }
    };
    
    // Upload with progress tracking if callback provided
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, audioBlob, metadata);
      
      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            reject(new Error('Upload failed. Please check your connection and try again.'));
          },
          () => {
            console.log('Upload completed successfully');
            resolve(filePath);
          }
        );
      });
    } else {
      // Simple upload without progress
      await uploadBytes(storageRef, audioBlob, metadata);
      return filePath;
    }
  } catch (error) {
    console.error('Error uploading recording:', error);
    throw new Error('Failed to upload recording. Please try again.');
  }
};

/**
 * Get recording duration from blob
 * @param {Blob} blob - Audio blob
 * @returns {Promise<number>} Duration in seconds
 */
export const getRecordingDuration = (blob) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration || 0);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });
    
    audio.src = url;
  });
};

/**
 * Check if browser supports audio recording
 * @returns {boolean} Whether recording is supported
 */
export const isRecordingSupported = () => {
  return !!(navigator.mediaDevices && 
           navigator.mediaDevices.getUserMedia && 
           window.MediaRecorder);
};