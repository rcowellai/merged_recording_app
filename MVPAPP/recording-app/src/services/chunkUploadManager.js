/**
 * Love Retold Chunk Upload Manager - Real Progressive Upload Implementation
 * Handles real-time progressive chunk uploading during recording to Love Retold storage paths
 */

import { ref, uploadBytes } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db, initializeAnonymousAuth } from './firebase.js';
import { generateStoragePaths } from '../utils/sessionParser.js';

/**
 * Love Retold Chunk Upload Manager Class
 * Handles progressive upload of recording chunks to Love Retold Firebase Storage
 */
export class ChunkUploadManager {
  constructor(sessionId, sessionComponents, options = {}) {
    this.sessionId = sessionId;
    this.sessionComponents = sessionComponents;
    this.options = {
      chunkSize: 5 * 1024 * 1024, // 5MB Love Retold chunks
      maxRetries: 3,
      retryDelay: 1000,
      maxConcurrentUploads: 2,
      progressCallback: null,
      ...options
    };
    
    this.uploadQueue = [];
    this.uploadedChunks = new Map();
    this.failedChunks = [];
    this.activeUploads = new Set();
    this.isActive = false;
    this.totalChunks = 0;
    
    // Generate Love Retold storage paths
    this.storagePaths = generateStoragePaths(sessionComponents, sessionId);
    
    console.log('📤 ChunkUploadManager initialized for Love Retold:', {
      sessionId,
      userId: sessionComponents.userId,
      storagePath: this.storagePaths.chunksFolder
    });
  }
  
  /**
   * Queue a chunk for progressive upload
   * @param {Object} chunkData - Chunk data with metadata
   */
  async queueChunk(chunkData) {
    console.log(`📤 Queuing chunk ${chunkData.index} for Love Retold upload (${chunkData.size} bytes)`);
    
    this.uploadQueue.push({
      ...chunkData,
      queuedAt: Date.now(),
      retryCount: 0
    });
    
    this.totalChunks = Math.max(this.totalChunks, chunkData.index + 1);
    
    // Start processing if not already active
    if (!this.isActive) {
      this.isActive = true;
      this.processUploadQueue();
    }
  }
  
  /**
   * Process upload queue with concurrency control
   * @private
   */
  async processUploadQueue() {
    console.log('⚡ Processing Love Retold upload queue...');
    
    while (this.uploadQueue.length > 0 && this.activeUploads.size < this.options.maxConcurrentUploads) {
      const chunkData = this.uploadQueue.shift();
      
      // Skip if already uploaded
      if (this.uploadedChunks.has(chunkData.index)) {
        continue;
      }
      
      this.uploadSingleChunk(chunkData);
    }
    
    // Check if all chunks are processed
    if (this.uploadQueue.length === 0 && this.activeUploads.size === 0) {
      this.isActive = false;
      console.log('✅ All chunks processed');
    }
  }
  
  /**
   * Upload a single chunk to Love Retold storage
   * @param {Object} chunkData - Chunk data to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadSingleChunk(chunkData) {
    this.activeUploads.add(chunkData.index);
    
    try {
      await initializeAnonymousAuth();
      
      // Love Retold chunk path
      const chunkPath = this.storagePaths.chunkPath(chunkData.index);
      const storageRef = ref(storage, chunkPath);
      
      console.log(`🔄 Uploading chunk ${chunkData.index} to Love Retold: ${chunkPath}`);
      
      const metadata = {
        contentType: chunkData.blob.type || 'video/webm',
        customMetadata: {
          sessionId: this.sessionId,
          userId: this.sessionComponents.userId,
          chunkIndex: chunkData.index.toString(),
          timestamp: Date.now().toString(),
          originalSize: chunkData.size.toString()
        }
      };
      
      // Upload with retry logic
      let lastError = null;
      for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
        try {
          await uploadBytes(storageRef, chunkData.blob, metadata);
          
          const result = {
            chunkIndex: chunkData.index,
            uploadedAt: Date.now(),
            size: chunkData.size,
            path: chunkPath,
            attempt: attempt + 1
          };
          
          this.uploadedChunks.set(chunkData.index, result);
          
          // Update session progress
          await this.updateSessionProgress();
          
          console.log(`✅ Chunk ${chunkData.index} uploaded successfully (attempt ${attempt + 1})`);
          
          // Trigger progress callback
          if (this.options.progressCallback) {
            this.options.progressCallback({
              uploadedChunks: this.uploadedChunks.size,
              totalChunks: this.totalChunks,
              progress: (this.uploadedChunks.size / this.totalChunks) * 100,
              currentChunk: chunkData.index
            });
          }
          
          break; // Success, exit retry loop
          
        } catch (error) {
          lastError = error;
          console.error(`❌ Chunk ${chunkData.index} upload attempt ${attempt + 1} failed:`, error);
          
          if (attempt < this.options.maxRetries - 1) {
            const delay = this.options.retryDelay * Math.pow(2, attempt); // Exponential backoff
            console.log(`⏳ Retrying chunk ${chunkData.index} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (lastError) {
        // All retries failed
        this.failedChunks.push({
          ...chunkData,
          error: lastError.message,
          failedAt: Date.now()
        });
        
        console.error(`💥 Chunk ${chunkData.index} failed after ${this.options.maxRetries} attempts:`, lastError);
        throw lastError;
      }
      
    } finally {
      this.activeUploads.delete(chunkData.index);
      
      // Continue processing queue
      if (this.uploadQueue.length > 0) {
        this.processUploadQueue();
      }
    }
  }
  
  /**
   * Update session progress in Love Retold Firestore
   * @private
   */
  async updateSessionProgress() {
    try {
      const progress = Math.round((this.uploadedChunks.size / this.totalChunks) * 100);
      
      await updateDoc(doc(db, 'recordingSessions', this.sessionId), {
        'recordingData.uploadProgress': progress,
        'recordingData.lastChunkUploaded': Math.max(...this.uploadedChunks.keys()),
        'recordingData.chunksUploaded': this.uploadedChunks.size
      });
      
      console.log(`📊 Session progress updated: ${progress}% (${this.uploadedChunks.size}/${this.totalChunks} chunks)`);
      
    } catch (error) {
      console.warn('⚠️ Failed to update session progress:', error);
    }
  }
  
  /**
   * Get upload progress
   * @returns {Object} Progress information
   */
  getProgress() {
    return {
      uploaded: this.uploadedChunks.size,
      queued: this.uploadQueue.length,
      failed: this.failedChunks.length,
      total: this.totalChunks,
      progress: this.totalChunks > 0 ? 
        (this.uploadedChunks.size / this.totalChunks) * 100 : 0
    };
  }
  
  /**
   * Wait for all chunks to complete
   * @returns {Promise<Object>} Upload summary
   */
  async waitForCompletion() {
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        if (this.uploadQueue.length === 0 && this.activeUploads.size === 0) {
          const summary = {
            totalChunks: this.totalChunks,
            uploadedChunks: this.uploadedChunks.size,
            failedChunks: this.failedChunks.length,
            success: this.failedChunks.length === 0,
            uploadedPaths: Array.from(this.uploadedChunks.values()).map(chunk => chunk.path)
          };
          
          console.log('📊 Upload completion summary:', summary);
          resolve(summary);
        } else {
          setTimeout(checkCompletion, 500); // Check every 500ms
        }
      };
      
      checkCompletion();
      
      // Timeout after 10 minutes
      setTimeout(() => {
        reject(new Error('Upload timeout: chunks did not complete within 10 minutes'));
      }, 10 * 60 * 1000);
    });
  }
  
  /**
   * Clean up upload manager
   */
  cleanup() {
    this.uploadQueue = [];
    this.uploadedChunks.clear();
    this.failedChunks = [];
    this.activeUploads.clear();
    this.isActive = false;
    console.log('🧹 Love Retold ChunkUploadManager cleaned up');
  }
}

/**
 * Create Love Retold chunk upload manager instance
 * @param {string} sessionId - Session ID
 * @param {Object} sessionComponents - Parsed session components
 * @param {Object} options - Configuration options
 * @returns {ChunkUploadManager} Upload manager instance
 */
export const createChunkUploadManager = (sessionId, sessionComponents, options = {}) => {
  return new ChunkUploadManager(sessionId, sessionComponents, options);
};

/**
 * Progressive upload hook for Love Retold chunks
 * This function is called from onChunkReady callback for real-time uploading
 * @param {Object} chunkData - Chunk data to upload
 * @param {string} sessionId - Session ID
 * @param {Object} sessionComponents - Session components
 * @param {ChunkUploadManager} uploadManager - Upload manager instance
 * @returns {Promise<void>} Upload promise
 */
export const uploadChunkInBackground = async (chunkData, sessionId, sessionComponents, uploadManager) => {
  try {
    if (!uploadManager) {
      console.warn('⚠️ No upload manager provided, creating new instance');
      uploadManager = createChunkUploadManager(sessionId, sessionComponents);
    }
    
    // Validate chunk data
    if (!validateChunkData(chunkData)) {
      throw new Error(`Invalid chunk data for chunk ${chunkData.index}`);
    }
    
    console.log(`🚀 Progressive upload for chunk ${chunkData.index} in Love Retold session ${sessionId}`);
    
    // Queue chunk for immediate upload
    await uploadManager.queueChunk({
      index: chunkData.index,
      blob: chunkData.data,
      size: chunkData.size || chunkData.data.size,
      timestamp: chunkData.timestamp || Date.now()
    });
    
    return { success: true, chunkIndex: chunkData.index };
    
  } catch (error) {
    console.error(`❌ Progressive upload failed for chunk ${chunkData.index}:`, error);
    throw error;
  }
};

/**
 * Validate chunk data for upload
 * @param {Object} chunkData - Chunk data to validate
 * @returns {boolean} Whether chunk is valid for upload
 */
export const validateChunkData = (chunkData) => {
  const isValid = (
    chunkData &&
    typeof chunkData.index === 'number' &&
    (chunkData.data instanceof Blob || chunkData.blob instanceof Blob) &&
    (chunkData.size > 0 || (chunkData.data && chunkData.data.size > 0)) &&
    typeof chunkData.timestamp === 'number'
  );
  
  if (!isValid) {
    console.warn('⚠️ Invalid chunk data:', chunkData);
  }
  
  return isValid;
};