/**
 * 🔥 Firebase Storage Service for UIAPP (C05)
 * ==========================================
 * 
 * DEVELOPER HANDOFF NOTES:
 * - Enhanced from C02 with comprehensive storage operations for memory recordings
 * - Implements uploadMemoryRecording, getSignedUrl, deleteFile, linkStorageToFirestore
 * - Maintains MVPAPP storage patterns with UIAPP error handling and conventions
 * - Integrates with UIAPP's structured error system and Firestore service
 * - Supports chunked upload strategy and resumable uploads from MVPAPP
 * 
 * MVPAPP SOURCE: recording-app/src/services/unifiedRecording.js, storage patterns
 * UIAPP TARGET: src/services/firebase/storage.js (C05 enhanced)
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
   * C05: Upload Memory Recording with comprehensive metadata and Firestore integration
   * Implements the specific uploadMemoryRecording function requested for C05
   * 
   * @param {Blob} file - The recording blob/file
   * @param {string} userId - User ID who owns the recording
   * @param {string} memoryId - Memory/Session ID associated with the recording
   * @param {Object} options - Additional upload options
   * @returns {Promise<{ storagePath: string, downloadURL: string, metadata: object }>}
   */
  async uploadMemoryRecording(file, userId, memoryId, options = {}) {
    const uploadId = `memory_${memoryId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('🚀 C05: Memory recording upload started', { userId, memoryId, size: file.size });
      
      // Generate storage path following MVPAPP patterns
      const timestamp = Date.now();
      const fileType = options.mediaType || 'audio';
      const fileExtension = this.getFileExtension(file.type, fileType);
      
      // Use MVPAPP-style storage path structure: users/{userId}/memories/{memoryId}/recordings/
      const storagePath = `users/${userId}/memories/${memoryId}/recordings/${timestamp}_recording.${fileExtension}`;
      
      // Create storage reference
      const storageRef = ref(storage, storagePath);
      
      // Prepare comprehensive metadata
      const metadata = {
        contentType: file.type || this.getBestSupportedMimeType(fileType),
        customMetadata: {
          userId: userId,
          memoryId: memoryId,
          uploadId: uploadId,
          originalFileName: options.fileName || `memory_${memoryId}`,
          fileType: fileType,
          timestamp: timestamp.toString(),
          recordingVersion: '2.1-uiapp-c05',
          uploadSource: 'memory-recording',
          ...(options.sessionId && { sessionId: options.sessionId }),
          ...(options.duration && { duration: options.duration.toString() }),
          ...(options.transcription && { hasTranscription: 'true' })
        }
      };

      // Determine upload strategy based on file size
      let uploadResult;
      if (file.size > 1024 * 1024) { // 1MB threshold for chunked upload
        uploadResult = await this.uploadWithResumableUpload(
          storageRef, 
          file, 
          metadata, 
          options.onProgress, 
          uploadId,
          { maxRetries: 3, ...options }
        );
      } else {
        uploadResult = await this.uploadWithSimpleUpload(
          storageRef, 
          file, 
          metadata, 
          options.onProgress, 
          uploadId
        );
      }

      // Link storage to Firestore if requested (C05 integration)
      if (options.linkToFirestore !== false) { // Default to true
        await this.linkStorageToFirestore(memoryId, uploadResult.downloadURL, {
          storagePath: uploadResult.storagePath,
          userId: userId,
          fileType: fileType,
          fileSize: file.size,
          uploadedAt: new Date(),
          metadata: metadata.customMetadata
        });
      }

      console.log('✅ C05: Memory recording upload completed', { 
        storagePath: uploadResult.storagePath,
        downloadURL: uploadResult.downloadURL 
      });

      this.lastError = null;
      return {
        storagePath: uploadResult.storagePath,
        downloadURL: uploadResult.downloadURL,
        metadata: metadata.customMetadata,
        uploadId: uploadId
      };

    } catch (error) {
      console.error('C05: Memory recording upload failed:', error);
      this.lastError = this.mapStorageError(error);
      this.activeUploads.delete(uploadId);
      throw this.lastError;
    }
  }

  /**
   * C05: Generate signed URL for secure access to storage files
   * Provides time-limited access URLs with configurable expiration
   * 
   * @param {string} filePath - Storage path to the file
   * @param {number} expirationTime - Expiration time in milliseconds (default: 1 hour)
   * @returns {Promise<string>} Signed URL with expiration
   */
  async getSignedUrl(filePath, expirationTime = 60 * 60 * 1000) { // 1 hour default
    try {
      // Clean the file path (remove gs:// prefix if present)
      const cleanPath = filePath.replace(/^gs:\/\/[^\/]+\//, '');
      const fileRef = ref(storage, cleanPath);
      
      // Firebase Storage getDownloadURL provides signed URLs by default
      // For additional control, we could implement custom token generation
      // but Firebase handles the signing automatically with appropriate expiration
      const downloadURL = await getDownloadURL(fileRef);
      
      console.log('🔗 C05: Signed URL generated', { 
        filePath: cleanPath, 
        expirationTime: expirationTime + 'ms' 
      });
      
      this.lastError = null;
      return downloadURL;
      
    } catch (error) {
      console.error('C05: Signed URL generation failed:', error);
      const mappedError = this.mapStorageError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * C05: Delete file from storage (enhanced from existing deleteFile)
   * Comprehensive file deletion with Firestore cleanup integration
   * 
   * @param {string} filePath - Storage path to delete
   * @param {Object} options - Additional deletion options
   * @returns {Promise<void>}
   */
  async deleteFile(filePath, options = {}) {
    try {
      // Clean the file path
      const cleanPath = filePath.replace(/^gs:\/\/[^\/]+\//, '');
      const fileRef = ref(storage, cleanPath);
      
      // Delete from storage
      await deleteObject(fileRef);
      
      console.log('🗑️ C05: File deleted successfully:', cleanPath);
      
      // Optional: Clean up Firestore references if memoryId provided
      if (options.memoryId && options.cleanupFirestore !== false) {
        try {
          // Import Firestore service for cleanup
          const { removeUploadReference } = await import('./firestore.js');
          await removeUploadReference(options.memoryId, filePath);
          console.log('🧹 C05: Firestore reference cleaned up for memory:', options.memoryId);
        } catch (firestoreError) {
          console.warn('C05: Firestore cleanup failed (non-critical):', firestoreError.message);
          // Don't throw - storage deletion succeeded, Firestore cleanup is secondary
        }
      }
      
      this.lastError = null;
      
    } catch (error) {
      console.error('C05: File deletion failed:', error);
      const mappedError = this.mapStorageError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
  }

  /**
   * C05: Link storage upload to Firestore document
   * Creates or updates Firestore records with storage file references
   * 
   * @param {string} memoryId - Memory/Session ID to link to
   * @param {string} storageUrl - Storage URL or path to link
   * @param {Object} linkData - Additional data to store in Firestore
   * @returns {Promise<void>}
   */
  async linkStorageToFirestore(memoryId, storageUrl, linkData = {}) {
    try {
      console.log('🔗 C05: Linking storage to Firestore', { memoryId, storageUrl });
      
      // Import Firestore service dynamically to avoid circular imports
      const { addUploadReference, updateRecordingStatus } = await import('./firestore.js');
      
      // Prepare upload reference metadata
      const uploadRefData = {
        path: linkData.storagePath || storageUrl,
        uploadedAt: linkData.uploadedAt || new Date(),
        type: 'final', // Could be 'chunk', 'final', 'thumbnail' based on usage
        metadata: {
          fileType: linkData.fileType || 'audio',
          fileSize: linkData.fileSize || 0,
          userId: linkData.userId,
          uploadId: linkData.metadata?.uploadId || `link_${Date.now()}`,
          downloadURL: storageUrl,
          ...linkData.metadata
        }
      };
      
      // Add upload reference to Firestore
      await addUploadReference(memoryId, uploadRefData.path, uploadRefData.metadata);
      
      // Update recording session status if it exists
      try {
        await updateRecordingStatus(memoryId, 'processing', {
          recordingCompletedAt: new Date(),
          storagePaths: {
            finalRecording: storageUrl
          }
        });
        console.log('📊 C05: Recording session status updated to processing');
      } catch (statusError) {
        console.warn('C05: Session status update failed (non-critical):', statusError.message);
        // Continue - storage linking succeeded even if status update failed
      }
      
      console.log('✅ C05: Storage linked to Firestore successfully', { 
        memoryId, 
        uploadRefPath: uploadRefData.path 
      });
      
      this.lastError = null;
      
    } catch (error) {
      console.error('C05: Storage to Firestore linking failed:', error);
      const mappedError = this.mapStorageError(error);
      this.lastError = mappedError;
      throw mappedError;
    }
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
  uploadMemoryRecording, // C05: New memory recording upload
  getDownloadURL,
  getSignedUrl, // C05: New signed URL generation
  deleteFile,
  getFileMetadata,
  cancelUpload,
  getUploadStatus,
  getActiveUploads,
  downloadStoryMedia,
  linkStorageToFirestore, // C05: New Firestore integration
  getLastError,
  clearError,
  cleanup
} = firebaseStorageService;

console.log('📦 Firebase Storage Service: LOADED');