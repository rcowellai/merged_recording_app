/**
 * useProgressiveUpload.js
 * -----------------------
 * SLICE-D: Progressive chunk upload hook for 15-minute recordings
 * Manages chunk-by-chunk upload during recording to prevent memory overflow
 * Maintains Love Retold integration and preserves Slice A-B-C requirements
 */

import { useState, useRef, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../config/firebase';
import { firebaseErrorHandler } from '../utils/firebaseErrorHandler';
import { uploadErrorTracker } from '../utils/uploadErrorTracker';

/**
 * Progressive Upload Hook
 * Handles chunk-by-chunk upload during recording to Firebase Storage
 * 
 * @param {string} sessionId - Recording session ID
 * @param {Object} sessionComponents - Parsed session components (userId, promptId, etc.)
 * @param {Object} sessionData - Full session data including fullUserId (Slice A preservation)
 * @returns {Object} Progressive upload state and functions
 */
export function useProgressiveUpload(sessionId, sessionComponents, sessionData) {
  // Upload state management
  const [uploadProgress, setUploadProgress] = useState(0);
  const [chunksUploaded, setChunksUploaded] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  
  // Chunk tracking references
  const uploadedChunks = useRef([]);
  const currentChunkIndex = useRef(0);
  
  /**
   * Upload a single chunk to Firebase Storage
   * SLICE-D: Uses full userId from sessionData (preserves Slice A requirements)
   * 
   * @param {Blob} blob - Chunk blob to upload
   * @param {number} chunkIndex - Index of the chunk
   * @returns {Promise<Object>} Upload result
   */
  const uploadChunk = useCallback(async (blob, chunkIndex) => {
    try {
      // SLICE-D: Use full userId from sessionData (Slice A preservation)
      const fullUserId = sessionData?.fullUserId || sessionComponents.userId;
      
      // 🔍 DIAGNOSTIC LOGGING: Complete authentication and session state
      console.group(`🔍 DIAGNOSTIC: Chunk ${chunkIndex} Upload Analysis`);
      console.log('📦 SLICE-D: Uploading chunk', {
        chunkSize: blob.size,
        chunkIndex,
        fullUserId: fullUserId?.substring(0, 8) + '...' // Truncated for security
      });
      
      // 🔍 Authentication State Diagnosis
      console.log('🔐 Firebase Auth State:', {
        authUser: auth.currentUser ? {
          uid: auth.currentUser.uid,
          isAnonymous: auth.currentUser.isAnonymous,
          providerData: auth.currentUser.providerData,
          tokenResult: 'Will fetch below...'
        } : 'No authenticated user'
      });
      
      // 🔍 Session Data Diagnosis  
      console.log('📋 Session Data Analysis:', {
        sessionId,
        sessionComponents: {
          userId: sessionComponents?.userId,
          promptId: sessionComponents?.promptId,
          hasComponents: !!sessionComponents
        },
        sessionData: {
          fullUserId: sessionData?.fullUserId,
          hasSessionData: !!sessionData,
          sessionDocument: sessionData?.sessionDocument ? {
            status: sessionData.sessionDocument.status,
            expiresAt: sessionData.sessionDocument.expiresAt
          } : 'No session document'
        },
        userIdComparison: {
          componentsUserId: sessionComponents?.userId,
          sessionDataUserId: sessionData?.fullUserId,
          finalUserId: fullUserId,
          match: sessionComponents?.userId === sessionData?.fullUserId
        }
      });
      
      // 🔍 Storage Path Analysis
      const storagePath = `users/${fullUserId}/recordings/${sessionId}/chunks/chunk_${chunkIndex}.webm`;
      console.log('📂 Storage Path Analysis:', {
        fullPath: storagePath,
        pathComponents: {
          userId: fullUserId,
          sessionId: sessionId,
          fileName: `chunk_${chunkIndex}.webm`
        },
        pathLength: storagePath.length,
        userIdInPath: fullUserId?.length
      });
      
      // Customer support: Track chunk upload for troubleshooting
      uploadErrorTracker.logInfo('Progressive chunk upload started', {
        sessionId,
        fullUserId,
        truncatedUserId: sessionComponents?.userId,
        step: `chunk_${chunkIndex}`,
        chunkSize: blob.size,
        chunkIndex
      });
      
      // 🔍 Firebase Auth Token Analysis (before operations)
      if (auth.currentUser) {
        try {
          const tokenResult = await auth.currentUser.getIdTokenResult();
          console.log('🎫 Firebase Auth Token Details:', {
            uid: auth.currentUser.uid,
            isAnonymous: auth.currentUser.isAnonymous,
            signInProvider: tokenResult.signInProvider,
            token: {
              authTime: tokenResult.authTime,
              issuedAtTime: tokenResult.issuedAtTime,
              expirationTime: tokenResult.expirationTime,
              claims: {
                firebase: tokenResult.claims.firebase,
                aud: tokenResult.claims.aud,
                iss: tokenResult.claims.iss
              }
            }
          });
        } catch (tokenError) {
          console.error('❌ Failed to get auth token:', tokenError);
        }
      }
      
      // Create chunk storage reference
      const chunkRef = ref(storage, 
        `users/${fullUserId}/recordings/${sessionId}/chunks/chunk_${chunkIndex}.webm`
      );
      
      console.log('🔗 Firebase Storage Reference:', {
        bucket: chunkRef.bucket,
        fullPath: chunkRef.fullPath,
        name: chunkRef.name,
        toString: chunkRef.toString()
      });

      // Upload chunk with retry logic
      console.log('⬆️ Starting uploadBytes operation...');
      const snapshot = await firebaseErrorHandler.withRetry(
        async () => await uploadBytes(chunkRef, blob),
        3, // Max retries
        `chunk-upload-${chunkIndex}`
      );
      
      console.log('✅ uploadBytes succeeded:', {
        bytesTransferred: snapshot.bytesTransferred,
        totalBytes: snapshot.totalBytes,
        state: snapshot.state,
        metadata: {
          size: snapshot.metadata.size,
          contentType: snapshot.metadata.contentType,
          timeCreated: snapshot.metadata.timeCreated
        }
      });
      
      console.log('🎯 Skipping getDownloadURL (not needed for Love Retold integration)');
      console.log('✅ Chunk upload completed - using storage path only');
      
      // Store chunk metadata (following Love Retold pattern - no download URL needed)
      const chunkMetadata = {
        index: chunkIndex,
        ref: snapshot.ref,
        size: blob.size,
        timestamp: Date.now(),
        storagePath: snapshot.ref.fullPath,
        // Note: downloadURL removed - not needed for Love Retold integration
        uploadMethod: 'progressive-chunk'
      };
      
      uploadedChunks.current[chunkIndex] = chunkMetadata;
      setChunksUploaded(prev => prev + 1);
      
      console.log(`✅ SLICE-D: Chunk ${chunkIndex} uploaded successfully`, {
        size: blob.size,
        storagePath: chunkMetadata.storagePath,
        uploadMethod: chunkMetadata.uploadMethod
      });
      
      // Customer support: Track successful chunk upload
      uploadErrorTracker.logInfo('Progressive chunk upload completed', {
        sessionId,
        fullUserId,
        step: `chunk_${chunkIndex}_success`,
        chunkSize: blob.size,
        storagePath: chunkMetadata.storagePath
      });
      
      console.groupEnd(); // End diagnostic group
      return { success: true, metadata: chunkMetadata };
      
    } catch (error) {
      console.error(`❌ SLICE-D: Chunk ${chunkIndex} upload failed:`, error);
      
      // 🔍 COMPREHENSIVE ERROR DIAGNOSIS
      console.group(`🚨 ERROR ANALYSIS: Chunk ${chunkIndex} Upload Failure`);
      
      console.error('📋 Error Details:', {
        errorType: error.constructor.name,
        errorCode: error.code,
        errorMessage: error.message,
        httpStatus: error.status,
        serverResponse: error.serverResponse,
        customData: error.customData,
        fullError: error
      });
      
      // Re-check auth state at time of error
      console.log('🔐 Auth State at Error Time:', {
        hasCurrentUser: !!auth.currentUser,
        currentUser: auth.currentUser ? {
          uid: auth.currentUser.uid,
          isAnonymous: auth.currentUser.isAnonymous,
          refreshToken: auth.currentUser.refreshToken ? 'Present' : 'Missing'
        } : 'No user'
      });
      
      // Session validation at error time
      console.log('📋 Session State at Error Time:', {
        sessionId,
        fullUserId: sessionData?.fullUserId || sessionComponents.userId,
        sessionStatus: sessionData?.sessionDocument?.status,
        sessionExpiry: sessionData?.sessionDocument?.expiresAt,
        timeNow: new Date().toISOString()
      });
      
      // Storage path debugging
      console.log('📂 Storage Path at Error Time:', {
        attemptedPath: `users/${sessionData?.fullUserId || sessionComponents.userId}/recordings/${sessionId}/chunks/chunk_${chunkIndex}.webm`,
        pathComponents: {
          userId: sessionData?.fullUserId || sessionComponents.userId,
          sessionId: sessionId,
          fileName: `chunk_${chunkIndex}.webm`
        }
      });
      
      // Firebase project and config debugging
      console.log('⚙️ Firebase Config at Error Time:', {
        storageBucket: storage.app.options.storageBucket,
        projectId: storage.app.options.projectId,
        authDomain: storage.app.options.authDomain
      });
      
      console.groupEnd(); // End error analysis group
      
      // Customer support: Track chunk upload failure
      uploadErrorTracker.logError('Progressive chunk upload failed', error, {
        sessionId,
        fullUserId: sessionData?.fullUserId,
        step: `chunk_${chunkIndex}_error`,
        chunkSize: blob.size,
        chunkIndex
      });
      
      const mappedError = firebaseErrorHandler.mapError(error, 'chunk-upload');
      setUploadError(mappedError);
      
      return { success: false, error: mappedError };
    }
  }, [sessionId, sessionComponents, sessionData]);

  /**
   * Process a recording chunk during active recording
   * Called by MediaRecorder ondataavailable during recording
   * 
   * @param {Blob} blob - Recording chunk blob
   * @returns {Promise<Object>} Upload result
   */
  const processRecordingChunk = useCallback(async (blob) => {
    if (!blob || blob.size === 0) {
      console.warn('SLICE-D: Empty chunk received, skipping upload');
      return { success: false, error: 'Empty chunk' };
    }
    
    setIsUploading(true);
    setUploadError(null);
    
    const chunkIndex = currentChunkIndex.current++;
    setTotalChunks(chunkIndex + 1);
    
    try {
      const result = await uploadChunk(blob, chunkIndex);
      
      // Update progress calculation
      if (result.success) {
        const progress = (chunksUploaded + 1) / (chunkIndex + 1);
        setUploadProgress(progress);
      }
      
      return result;
      
    } catch (error) {
      console.error('SLICE-D: Error processing recording chunk:', error);
      setUploadError(error);
      return { success: false, error };
    } finally {
      setIsUploading(false);
    }
  }, [uploadChunk, chunksUploaded]);

  /**
   * Finalize upload and create metadata for Love Retold integration
   * Called when recording is complete to assemble final recording reference
   * 
   * @returns {Promise<Object>} Final upload result with Love Retold compatibility
   */
  const finalizeUpload = useCallback(async () => {
    try {
      console.log('🎯 SLICE-D: Finalizing progressive upload for Love Retold integration');
      
      // SLICE-D: Use full userId for final path (Slice A preservation)
      const fullUserId = sessionData?.fullUserId || sessionComponents.userId;
      const finalPath = `users/${fullUserId}/recordings/${sessionId}/final/recording.webm`;
      
      // Calculate total size and duration
      const totalSize = uploadedChunks.current.reduce((sum, chunk) => sum + (chunk?.size || 0), 0);
      const chunkCount = uploadedChunks.current.filter(chunk => chunk).length;
      
      console.log('📊 SLICE-D: Upload summary:', {
        totalChunks: chunkCount,
        totalSize,
        uploadedChunks: chunksUploaded,
        finalPath
      });
      
      // Customer support: Track finalization for Love Retold integration
      uploadErrorTracker.logInfo('Progressive upload finalization', {
        sessionId,
        fullUserId,
        step: 'finalize',
        totalChunks: chunkCount,
        totalSize,
        finalPath
      });
      
      // Create metadata document for Love Retold compatibility
      const metadata = {
        // Chunk information
        chunks: uploadedChunks.current.filter(chunk => chunk),
        totalChunks: chunkCount,
        combinedSize: totalSize,
        
        // Love Retold integration fields
        finalPath,
        storagePath: finalPath,
        uploadedAt: Date.now(),
        uploadMethod: 'progressive-chunks', // SLICE-D identifier
        
        // Session information (Slice A-B preservation)
        sessionId,
        fullUserId,
        sessionComponents
      };
      
      console.log('✅ SLICE-D: Progressive upload finalized successfully');
      
      return {
        success: true,
        storagePath: finalPath,
        metadata,
        totalChunks: chunkCount,
        totalSize
      };
      
    } catch (error) {
      console.error('❌ SLICE-D: Error finalizing progressive upload:', error);
      
      uploadErrorTracker.logError('Progressive upload finalization failed', error, {
        sessionId,
        fullUserId: sessionData?.fullUserId,
        step: 'finalize_error'
      });
      
      setUploadError(error);
      return { success: false, error };
    }
  }, [sessionId, sessionComponents, sessionData, chunksUploaded]);

  /**
   * Cleanup chunks in case of upload failure or cancellation
   * Removes uploaded chunks from Firebase Storage
   */
  const cleanup = useCallback(async () => {
    try {
      console.log('🧹 SLICE-D: Cleaning up uploaded chunks');
      
      const cleanupPromises = uploadedChunks.current
        .filter(chunk => chunk && chunk.ref)
        .map(async (chunk) => {
          try {
            await chunk.ref.delete();
            console.log(`🗑️ Cleaned up chunk ${chunk.index}`);
          } catch (error) {
            console.warn(`Failed to cleanup chunk ${chunk.index}:`, error);
          }
        });
      
      await Promise.allSettled(cleanupPromises);
      
      // Reset state
      uploadedChunks.current = [];
      currentChunkIndex.current = 0;
      setChunksUploaded(0);
      setTotalChunks(0);
      setUploadProgress(0);
      setUploadError(null);
      
      console.log('✅ SLICE-D: Chunk cleanup completed');
      
    } catch (error) {
      console.error('❌ SLICE-D: Error during chunk cleanup:', error);
    }
  }, []);

  /**
   * Reset progressive upload state
   * Called when starting a new recording
   */
  const reset = useCallback(() => {
    uploadedChunks.current = [];
    currentChunkIndex.current = 0;
    setChunksUploaded(0);
    setTotalChunks(0);
    setUploadProgress(0);
    setUploadError(null);
    setIsUploading(false);
    
    console.log('🔄 SLICE-D: Progressive upload state reset');
  }, []);

  return {
    // State
    uploadProgress,
    chunksUploaded,
    totalChunks,
    isUploading,
    uploadError,
    
    // Functions
    processRecordingChunk,
    finalizeUpload,
    cleanup,
    reset,
    
    // Metadata access
    getUploadedChunks: () => uploadedChunks.current.filter(chunk => chunk),
    getTotalSize: () => uploadedChunks.current.reduce((sum, chunk) => sum + (chunk?.size || 0), 0)
  };
}

export default useProgressiveUpload;