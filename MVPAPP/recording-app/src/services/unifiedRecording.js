import { ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db, initializeAnonymousAuth } from './firebase.js';
import { generateStoragePaths } from '../utils/sessionParser.js';

/**
 * Unified Recording Service - Epic 2.1
 * Implements MP4-first codec strategy with chunked uploads and enhanced UX
 */

// Recording constants
const RECORDING_LIMITS = {
  MAX_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
  CHUNK_DURATION: 45 * 1000, // 45 seconds per chunk
  WARNING_TIME: 14 * 60 * 1000, // Warning at 14 minutes
};

// Unified codec strategy - MP4 first for 98% browser compatibility
const CODEC_STRATEGY = {
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

/**
 * Get the best supported MIME type for recording
 * @param {string} mediaType - 'audio' or 'video'
 * @returns {string} Best supported MIME type
 */
export const getBestSupportedMimeType = (mediaType = 'audio') => {
  const codecs = CODEC_STRATEGY[mediaType];
  
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
 * Get user media with enhanced constraints and just-in-time permissions
 * @param {Object} options - Recording options
 * @returns {Promise<MediaStream>} Media stream
 */
export const getEnhancedUserMedia = async (options = { audio: true, video: false }) => {
  try {
    // Enhanced constraints for better quality
    const constraints = {
      audio: options.audio ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      } : false,
      video: options.video ? {
        width: { ideal: 854, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 24, max: 30 },
        facingMode: 'user' // Front camera for selfie-style recording
      } : false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Lock orientation to portrait for video recording on mobile
    if (options.video && 'screen' in window && 'orientation' in window.screen) {
      try {
        await window.screen.orientation.lock('portrait');
      } catch (err) {
        console.log('Orientation lock not available or failed:', err.message);
      }
    }
    
    return stream;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    
    if (error.name === 'NotAllowedError') {
      throw new Error('Media access denied. Please allow microphone/camera access and try again.');
    } else if (error.name === 'NotFoundError') {
      throw new Error(`No ${options.video ? 'camera' : 'microphone'} found. Please connect the required device and try again.`);
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Your browser does not support media recording.');
    } else if (error.name === 'OverconstrainedError') {
      throw new Error('Camera/microphone constraints could not be satisfied. Please try again.');
    } else {
      throw new Error(`Unable to access ${options.video ? 'camera/microphone' : 'microphone'}. Please check your device settings.`);
    }
  }
};

/**
 * Enhanced chunked recording class
 */
export class ChunkedRecorder {
  constructor(stream, options = {}) {
    this.stream = stream;
    this.options = {
      mediaType: options.mediaType || 'audio',
      maxDuration: options.maxDuration || RECORDING_LIMITS.MAX_DURATION,
      chunkDuration: options.chunkDuration || RECORDING_LIMITS.CHUNK_DURATION,
      ...options
    };
    
    this.chunks = [];
    this.mediaRecorder = null;
    this.isRecording = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.currentChunk = 0;
    
    // Event handlers
    this.onChunkReady = options.onChunkReady || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});
    this.onWarning = options.onWarning || (() => {});
    this.onPauseStateChange = options.onPauseStateChange || (() => {}); // New callback
    
    // Background pause detection
    this.setupBackgroundPauseDetection();
    
    // Duration tracking
    this.durationTimer = null;
  }

  /**
   * Setup background pause detection
   */
  setupBackgroundPauseDetection() {
    this.handleVisibilityChange = () => {
      if (document.hidden && this.isRecording && !this.isPaused) {
        console.log('App backgrounded, auto-pausing recording');
        this.pause();
      }
    };
    
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Start recording with chunked strategy
   */
  async start() {
    try {
      if (this.isRecording) return;

      const mimeType = getBestSupportedMimeType(this.options.mediaType);
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        videoBitsPerSecond: this.options.mediaType === 'video' ? 1000000 : undefined, // 1 Mbps for video
        audioBitsPerSecond: 128000 // 128 kbps for audio
      });

      this.chunks = [];
      this.currentChunk = 0;
      this.startTime = Date.now();
      this.pausedTime = 0;

      // Setup event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push({
            data: event.data,
            timestamp: Date.now(),
            chunkIndex: this.currentChunk++
          });
          
          // Trigger chunk ready callback for immediate processing
          this.onChunkReady(event.data, this.currentChunk - 1);
          
          // Memory management - remove processed chunks
          if (this.chunks.length > 3) {
            this.chunks = this.chunks.slice(-2); // Keep only last 2 chunks in memory
          }
        }
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        this.onComplete(this.chunks);
        this.cleanup();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        this.onError(event.error);
      };

      // Start recording with chunk intervals
      this.mediaRecorder.start(this.options.chunkDuration);
      this.isRecording = true;
      this.isPaused = false;

      // Setup duration tracking and limits
      this.startDurationTracking();
      
    } catch (error) {
      console.error('Error starting chunked recording:', error);
      this.onError(error);
    }
  }

  /**
   * Start duration tracking with limits and warnings
   */
  startDurationTracking() {
    this.durationTimer = setInterval(() => {
      if (!this.isRecording || this.isPaused) return;
      
      const elapsed = Date.now() - this.startTime - this.pausedTime;
      this.onProgress(elapsed);
      
      // Warning at 14 minutes
      if (elapsed >= RECORDING_LIMITS.WARNING_TIME && elapsed < RECORDING_LIMITS.WARNING_TIME + 1000) {
        this.onWarning('Recording will automatically stop in 1 minute.');
      }
      
      // Auto-stop at 15 minutes
      if (elapsed >= RECORDING_LIMITS.MAX_DURATION) {
        console.log('Maximum recording duration reached, stopping automatically');
        this.stop();
      }
    }, 1000);
  }

  /**
   * Pause recording
   */
  pause() {
    if (!this.isRecording || this.isPaused) return;
    
    this.mediaRecorder.pause();
    this.isPaused = true;
    this.pauseStartTime = Date.now();
    
    // Notify component of pause state change
    this.onPauseStateChange(true);
  }

  /**
   * Resume recording
   */
  resume() {
    if (!this.isRecording || !this.isPaused) return;
    
    this.mediaRecorder.resume();
    this.isPaused = false;
    this.pausedTime += Date.now() - this.pauseStartTime;
    
    // Notify component of pause state change
    this.onPauseStateChange(false);
  }

  /**
   * Stop recording
   */
  stop() {
    if (!this.isRecording) return;
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.cleanup();
  }

  /**
   * Get current recording duration
   */
  getDuration() {
    if (!this.startTime) return 0;
    
    const elapsed = Date.now() - this.startTime - this.pausedTime;
    return elapsed;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Release orientation lock
    if ('screen' in window && 'orientation' in window.screen) {
      try {
        window.screen.orientation.unlock();
      } catch (err) {
        console.log('Orientation unlock failed:', err.message);
      }
    }
  }
}

/**
 * Love Retold chunked upload with proper storage paths and session updates
 * @param {string} sessionId - Love Retold session ID
 * @param {Object} sessionComponents - Parsed session components from parseSessionId
 * @param {Array} chunks - Array of recording chunks
 * @param {Object} options - Upload options
 * @returns {Promise<string>} Upload result
 */
export const uploadChunkedRecording = async (sessionId, sessionComponents, chunks, options = {}) => {
  try {
    await initializeAnonymousAuth();
    
    const {
      mediaType = 'audio',
      onProgress = () => {},
      onChunkUploaded = () => {},
      maxRetries = 3
    } = options;

    // Generate Love Retold storage paths
    const storagePaths = generateStoragePaths(sessionComponents, sessionId);
    const fileExtension = getBestSupportedMimeType(mediaType).includes('webm') ? 'webm' : 'mp4';
    const finalPath = storagePaths.finalPath(fileExtension);
    
    console.log('📁 Love Retold storage path:', finalPath);
    
    // Combine all chunks into final blob
    const allChunksData = chunks.map(chunk => chunk.data);
    const finalBlob = new Blob(allChunksData, { 
      type: getBestSupportedMimeType(mediaType)
    });
    
    const storageRef = ref(storage, finalPath);
    
    const metadata = {
      contentType: getBestSupportedMimeType(mediaType),
      customMetadata: {
        sessionId: sessionId,
        userId: sessionComponents.userId,
        promptId: sessionComponents.promptId,
        storytellerId: sessionComponents.storytellerId,
        recordingType: mediaType,
        timestamp: Date.now().toString(),
        chunkCount: chunks.length.toString(),
        recordingVersion: '2.1-love-retold'
      }
    };

    // Update session status to uploading
    try {
      await updateDoc(doc(db, 'recordingSessions', sessionId), {
        status: 'uploading',
        recordingData: {
          fileSize: finalBlob.size,
          mimeType: finalBlob.type,
          chunksCount: chunks.length
        }
      });
      console.log('📊 Session status updated to uploading');
    } catch (updateError) {
      console.warn('⚠️ Failed to update session status:', updateError);
      // Continue with upload even if status update fails
    }

    // Upload with retry logic
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const uploadTask = uploadBytesResumable(storageRef, finalBlob, metadata);
        
        const result = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress(Math.round(progress));
              
              // Update session progress
              if (progress % 10 === 0) { // Update every 10%
                updateDoc(doc(db, 'recordingSessions', sessionId), {
                  recordingData: {
                    uploadProgress: Math.round(progress)
                  }
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

        // Update session with final storage path
        await updateDoc(doc(db, 'recordingSessions', sessionId), {
          status: 'processing',
          storagePaths: {
            finalVideo: finalPath
          },
          recordingData: {
            uploadProgress: 100
          },
          recordingCompletedAt: new Date()
        });

        console.log('📊 Session updated with final storage path');
        return result;

      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          console.log(`Upload attempt ${attempt + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        }
      }
    }
    
    // Mark session as failed if all attempts fail
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
    console.error('Error in Love Retold chunked upload:', {
      error,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorName: error?.name,
      sessionId
    });
    
    // Provide more specific error messages based on error type
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
      // Enhanced fallback error message with more details
      const errorDetail = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Upload failed: ${errorDetail}. Please check browser console for details.`);
    }
  }
};

/**
 * Legacy upload function for backward compatibility
 * @deprecated Use uploadChunkedRecording with sessionComponents instead
 */
export const uploadChunkedRecordingLegacy = async (sessionId, chunks, options = {}) => {
  console.warn('⚠️ Using legacy upload function. Consider upgrading to Love Retold format.');
  
  try {
    await initializeAnonymousAuth();
    
    const {
      mediaType = 'audio',
      onProgress = () => {},
      maxRetries = 3
    } = options;

    const timestamp = Date.now();
    const fileExtension = mediaType === 'video' ? 'mp4' : 'm4a';
    const baseFilename = `${sessionId}_${timestamp}`;
    
    const allChunksData = chunks.map(chunk => chunk.data);
    const finalBlob = new Blob(allChunksData, { 
      type: getBestSupportedMimeType(mediaType)
    });
    
    const filename = `${baseFilename}.${fileExtension}`;
    const filePath = `recordings/${sessionId}/${filename}`;
    const storageRef = ref(storage, filePath);
    
    const metadata = {
      contentType: getBestSupportedMimeType(mediaType),
      customMetadata: {
        sessionId: sessionId,
        recordingType: mediaType,
        timestamp: timestamp.toString(),
        originalFilename: filename,
        chunkCount: chunks.length.toString(),
        recordingVersion: '2.1-legacy'
      }
    };

    const uploadTask = uploadBytesResumable(storageRef, finalBlob, metadata);
    
    return await new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(Math.round(progress));
        },
        reject,
        () => {
          console.log('Legacy upload completed successfully');
          resolve(filePath);
        }
      );
    });
    
  } catch (error) {
    console.error('Error in legacy upload:', error);
    throw new Error('Failed to upload recording. Please check your connection and try again.');
  }
};

/**
 * Check enhanced recording support
 * @returns {Object} Support information
 */
export const getRecordingSupport = () => {
  const hasBasicSupport = !!(
    navigator.mediaDevices && 
    navigator.mediaDevices.getUserMedia && 
    window.MediaRecorder
  );
  
  if (!hasBasicSupport) {
    return {
      supported: false,
      audio: false,
      video: false,
      codecs: {},
      message: 'Your browser does not support media recording. Please use a modern browser.'
    };
  }
  
  const audioCodec = getBestSupportedMimeType('audio');
  const videoCodec = getBestSupportedMimeType('video');
  
  return {
    supported: true,
    audio: true,
    video: true,
    codecs: {
      audio: audioCodec,
      video: videoCodec
    },
    mp4Support: audioCodec.includes('mp4') && videoCodec.includes('mp4'),
    message: 'Recording supported with enhanced codecs'
  };
};

/**
 * Create blob from chunks with proper MIME type
 * @param {Array} chunks - Recording chunks
 * @param {string} mediaType - 'audio' or 'video'
 * @returns {Blob} Combined blob
 */
export const createBlobFromChunks = (chunks, mediaType = 'audio') => {
  const chunkData = chunks.map(chunk => chunk.data);
  const mimeType = getBestSupportedMimeType(mediaType);
  return new Blob(chunkData, { type: mimeType });
};