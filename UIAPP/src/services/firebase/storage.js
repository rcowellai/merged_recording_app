/**
 * 🔥 Firebase Storage Service for UIAPP (C02)
 * ==========================================
 * 
 * DEVELOPER HANDOFF NOTES:
 * - Rewritten from MVPAPP unifiedRecording.js and stories.js using UIAPP patterns
 * - Maintains same upload functionality with UIAPP error handling and progress tracking
 * - Integrates with UIAPP's structured error system in utils/errors.js
 * - Follows UIAPP service conventions (same interface as localRecordingService.js)
 * - Uses chunked upload strategy and resumable uploads from MVPAPP
 * 
 * MVPAPP SOURCE: recording-app/src/services/unifiedRecording.js, stories.js
 * UIAPP TARGET: src/services/firebase/storage.js
 * CONVENTIONS: UIAPP error handling, config patterns, service interfaces
 */

import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL,
  deleteObject,
  getMetadata 
} from 'firebase/storage';
import { storage } from '../../config/firebase';
import { 
  createError, 
  UPLOAD_ERRORS 
} from '../../utils/errors';

/**
 * Firebase Storage Service
 * Provides file upload, download, and management with UIAPP error handling patterns
 */
class FirebaseStorageService {
  constructor() {
    this.lastError = null;
    this.activeUploads = new Map();
    
    // Recording constants from MVPAPP
    this.RECORDING_LIMITS = {
      MAX_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
      CHUNK_DURATION: 45 * 1000, // 45 seconds per chunk
      WARNING_TIME: 14 * 60 * 1000, // Warning at 14 minutes
    };

    // Unified codec strategy - MP4 first for 98% browser compatibility (from MVPAPP)
    this.CODEC_STRATEGY = {
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
  }

  /**
   * Get the best supported MIME type for recording
   * Maintains same logic as MVPAPP getBestSupportedMimeType
   * 
   * @param {string} mediaType - 'audio' or 'video'
   * @returns {string} Best supported MIME type
   */
  getBestSupportedMimeType(mediaType = 'audio') {
    const codecs = this.CODEC_STRATEGY[mediaType];
    
    for (const mimeType of codecs) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log(`Selected codec for ${mediaType}:`, mimeType);
        return mimeType;
      }
    }
    
    // Fallback to default if nothing is supported (shouldn't happen in modern browsers)
    console.warn(`No supported codec found for ${mediaType}, using default`);
    return mediaType === 'video' ? 'video/webm' : 'audio/webm';
  }

  /**
   * Upload recording with chunked strategy and progress tracking
   * Maintains same interface as UIAPP localRecordingService.uploadRecording
   * 
   * @param {Blob} blob - The recording blob
   * @param {string} fileName - The desired file name
   * @param {string} fileType - 'audio' or 'video'
   * @param {function} onProgress - A callback for upload progress (fraction)
   * @param {string} [actualMimeType] - Optional actual mime type
   * @param {Object} [options] - Additional upload options
   * @returns {Promise<{ docId: string, downloadURL: string }>}
   */
  async uploadRecording(
    blob,
    fileName,
    fileType,
    onProgress,
    actualMimeType,
    options = {}
  ) {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('🚀 Firebase upload started:', fileName, fileType);
      
      // Generate storage path
      const timestamp = Date.now();
      const fileExtension = this.getFileExtension(actualMimeType || blob.type, fileType);
      const storagePath = options.customPath || `recordings/${timestamp}/${fileName}.${fileExtension}`;
      
      // Create storage reference
      const storageRef = ref(storage, storagePath);
      
      // Prepare metadata
      const metadata = {
        contentType: actualMimeType || this.getBestSupportedMimeType(fileType),
        customMetadata: {
          originalFileName: fileName,
          fileType: fileType,
          timestamp: timestamp.toString(),
          uploadId: uploadId,
          recordingVersion: '2.1-uiapp',
          ...(options.sessionId && { sessionId: options.sessionId }),
          ...(options.userId && { userId: options.userId })
        }
      };

      // Use resumable upload for large files or when specified
      if (blob.size > 1024 * 1024 || options.resumable) { // 1MB threshold
        return await this.uploadWithResumableUpload(
          storageRef, 
          blob, 
          metadata, 
          onProgress, 
          uploadId,
          options
        );
      } else {
        return await this.uploadWithSimpleUpload(
          storageRef, 
          blob, 
          metadata, 
          onProgress, 
          uploadId
        );
      }
    } catch (error) {
      console.error('Upload failed:', error);
      this.lastError = this.mapStorageError(error);
      this.activeUploads.delete(uploadId);
      throw this.lastError;
    }
  }

  /**
   * Resumable upload implementation
   * Based on MVPAPP uploadChunkedRecording logic
   */
  async uploadWithResumableUpload(storageRef, blob, metadata, onProgress, uploadId, options = {}) {
    const maxRetries = options.maxRetries || 3;
    let lastError = null;

    // Store upload reference for cancellation/resumption
    this.activeUploads.set(uploadId, { storageRef, blob, metadata, status: 'uploading' });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const uploadTask = uploadBytesResumable(storageRef, blob, metadata);
        
        const result = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes);
              if (onProgress) {
                onProgress(progress);
              }
              
              // Update upload status
              this.activeUploads.set(uploadId, {
                ...this.activeUploads.get(uploadId),
                progress: progress,
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes
              });
            },
            (error) => {
              console.error(`Upload attempt ${attempt + 1} failed:`, error);
              reject(error);
            },
            async () => {
              try {
                console.log('✅ Firebase upload completed successfully');
                const downloadURL = await getDownloadURL(storageRef);
                resolve({
                  docId: uploadId,
                  downloadURL: downloadURL,
                  storagePath: storageRef.fullPath
                });
              } catch (urlError) {
                reject(urlError);
              }
            }
          );
        });

        // Update final status
        this.activeUploads.set(uploadId, {
          ...this.activeUploads.get(uploadId),
          status: 'completed',
          downloadURL: result.downloadURL
        });

        this.lastError = null;
        return result;

      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          console.log(`Upload attempt ${attempt + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        }
      }
    }

    // Mark upload as failed
    this.activeUploads.set(uploadId, {
      ...this.activeUploads.get(uploadId),
      status: 'failed',
      error: lastError
    });

    throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Simple upload implementation for smaller files
   */
  async uploadWithSimpleUpload(storageRef, blob, metadata, onProgress, uploadId) {
    this.activeUploads.set(uploadId, { storageRef, blob, metadata, status: 'uploading' });

    // Simulate progress for simple upload
    if (onProgress) {
      const progressInterval = setInterval(() => {
        // This will be cleared when upload completes
      }, 100);

      try {
        // Simulate progressive upload
        onProgress(0.3);
        await uploadBytes(storageRef, blob, metadata);
        onProgress(0.8);
        
        const downloadURL = await getDownloadURL(storageRef);
        onProgress(1.0);
        
        clearInterval(progressInterval);
        
        this.activeUploads.set(uploadId, {
          ...this.activeUploads.get(uploadId),
          status: 'completed',
          downloadURL: downloadURL
        });

        this.lastError = null;
        return {
          docId: uploadId,
          downloadURL: downloadURL,
          storagePath: storageRef.fullPath
        };
      } finally {
        clearInterval(progressInterval);
      }
    } else {
      await uploadBytes(storageRef, blob, metadata);
      const downloadURL = await getDownloadURL(storageRef);
      
      this.activeUploads.set(uploadId, {
        ...this.activeUploads.get(uploadId),
        status: 'completed',
        downloadURL: downloadURL
      });

      this.lastError = null;
      return {
        docId: uploadId,
        downloadURL: downloadURL,
        storagePath: storageRef.fullPath
      };
    }
  }

  /**
   * Get download URL for a storage path
   * Maintains same interface as MVPAPP getMediaDownloadURL
   * 
   * @param {string} storagePath - Firebase Storage path (gs:// format or regular path)
   * @returns {Promise<string>} Download URL
   */
  async getDownloadURL(storagePath) {
    try {
      // Handle gs:// format paths
      const path = storagePath.replace(/^gs:\/\/[^\/]+\//, '');
      const mediaRef = ref(storage, path);
      const downloadURL = await getDownloadURL(mediaRef);
      
      this.lastError = null;
      return downloadURL;
    } catch (error) {
      console.error('Error getting download URL:', error);
      const mappedError = this.mapStorageError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Delete a file from storage
   * @param {string} storagePath - Storage path to delete
   * @returns {Promise<void>}
   */
  async deleteFile(storagePath) {
    try {
      const path = storagePath.replace(/^gs:\/\/[^\/]+\//, '');
      const fileRef = ref(storage, path);
      await deleteObject(fileRef);
      
      console.log('🗑️ File deleted successfully:', path);
      this.lastError = null;
    } catch (error) {
      console.error('Error deleting file:', error);
      const mappedError = this.mapStorageError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Get file metadata
   * @param {string} storagePath - Storage path
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(storagePath) {
    try {
      const path = storagePath.replace(/^gs:\/\/[^\/]+\//, '');
      const fileRef = ref(storage, path);
      const metadata = await getMetadata(fileRef);
      
      this.lastError = null;
      return metadata;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      const mappedError = this.mapStorageError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Cancel an active upload
   * @param {string} uploadId - Upload ID to cancel
   * @returns {Promise<void>}
   */
  async cancelUpload(uploadId) {
    const upload = this.activeUploads.get(uploadId);
    if (upload && upload.uploadTask) {
      upload.uploadTask.cancel();
      this.activeUploads.delete(uploadId);
      console.log('🚫 Upload cancelled:', uploadId);
    }
  }

  /**
   * Get upload status
   * @param {string} uploadId - Upload ID
   * @returns {Object|null} Upload status or null
   */
  getUploadStatus(uploadId) {
    return this.activeUploads.get(uploadId) || null;
  }

  /**
   * Get all active uploads
   * @returns {Map} Map of active uploads
   */
  getActiveUploads() {
    return new Map(this.activeUploads);
  }

  /**
   * Get file extension based on MIME type and file type
   * @param {string} mimeType - MIME type
   * @param {string} fileType - 'audio' or 'video'
   * @returns {string} File extension
   */
  getFileExtension(mimeType, fileType) {
    if (mimeType.includes('webm')) {
      return 'webm';
    } else if (mimeType.includes('mp4')) {
      return fileType === 'video' ? 'mp4' : 'm4a';
    } else if (mimeType.includes('wav')) {
      return 'wav';
    } else if (mimeType.includes('ogg')) {
      return 'ogg';
    } else {
      return fileType === 'video' ? 'mp4' : 'm4a';
    }
  }

  /**
   * Download story media file (from MVPAPP stories.js)
   * @param {Object} story - Story object  
   * @param {string} type - 'audio' or 'video'
   */
  async downloadStoryMedia(story, type = 'audio') {
    try {
      const mediaUrl = type === 'video' && story.videoUrl ? story.videoUrl : story.audioUrl;
      if (!mediaUrl) {
        throw new Error(`No ${type} file available for this story`);
      }
      
      const downloadUrl = await this.getDownloadURL(mediaUrl);
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${story.question.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.${type === 'video' ? 'webm' : 'wav'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      this.lastError = null;
    } catch (error) {
      console.error('Download failed:', error);
      const mappedError = this.mapStorageError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * Get last storage operation error
   * @returns {Error|null} Last error or null
   */
  getLastError() {
    return this.lastError;
  }

  /**
   * Clear last error
   */
  clearError() {
    this.lastError = null;
  }

  /**
   * Cleanup active uploads and resources
   */
  cleanup() {
    console.log('🧹 Cleaning up Firebase Storage service...');
    this.activeUploads.forEach((upload, uploadId) => {
      if (upload.uploadTask) {
        upload.uploadTask.cancel();
      }
    });
    this.activeUploads.clear();
    this.lastError = null;
  }

  /**
   * Map Firebase Storage errors to UIAPP error patterns
   * @param {Error} error - Storage error
   * @returns {Error} Mapped UIAPP error
   */
  mapStorageError(error) {
    if (!error) return null;

    // Handle Firebase storage errors
    if (error.code && error.code.startsWith('storage/')) {
      switch (error.code) {
        case 'storage/unauthorized':
          return createError(
            UPLOAD_ERRORS.PERMISSION_DENIED,
            'Authentication failed. Please refresh the page and try again.',
            error
          );
        case 'storage/quota-exceeded':
          return createError(
            UPLOAD_ERRORS.QUOTA_EXCEEDED,
            'Storage quota exceeded. Please try again later or contact support.',
            error
          );
        case 'storage/invalid-format':
          return createError(
            UPLOAD_ERRORS.INVALID_FILE,
            'Invalid file format. Please try recording again.',
            error
          );
        case 'storage/retry-limit-exceeded':
          return createError(
            UPLOAD_ERRORS.NETWORK_ERROR,
            'Upload failed after multiple attempts. Please check your connection and try again.',
            error
          );
        case 'storage/canceled':
          return createError(
            UPLOAD_ERRORS.CANCELLED,
            'Upload was cancelled.',
            error
          );
        case 'storage/object-not-found':
          return createError(
            UPLOAD_ERRORS.NOT_FOUND,
            'File not found.',
            error
          );
        default:
          return createError(
            UPLOAD_ERRORS.UNKNOWN,
            `Upload failed: ${error.message || 'Storage error occurred'}`,
            error
          );
      }
    }

    // Handle network errors
    if (error.message && error.message.includes('network')) {
      return createError(
        UPLOAD_ERRORS.NETWORK_ERROR,
        'Network error. Please check your connection and try again.',
        error
      );
    }

    // Handle timeout errors
    if (error.message && error.message.includes('timeout')) {
      return createError(
        UPLOAD_ERRORS.TIMEOUT,
        'Upload timeout. Please check your connection and try again.',
        error
      );
    }

    // Handle generic errors
    return createError(
      UPLOAD_ERRORS.UNKNOWN,
      error.message || 'An unknown storage error occurred.',
      error
    );
  }
}

// Create singleton instance following UIAPP patterns
const firebaseStorageService = new FirebaseStorageService();

// Export service instance and individual functions for flexibility
export default firebaseStorageService;

export const {
  getBestSupportedMimeType,
  uploadRecording,
  getDownloadURL,
  deleteFile,
  getFileMetadata,
  cancelUpload,
  getUploadStatus,
  getActiveUploads,
  downloadStoryMedia,
  getLastError,
  clearError,
  cleanup
} = firebaseStorageService;

console.log('📦 Firebase Storage Service: LOADED');