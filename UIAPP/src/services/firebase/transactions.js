/**
 * 🔥 Firebase Transaction Service for UIAPP - Step 2 Atomic Operations
 * ===================================================================
 * 
 * STEP 2 IMPLEMENTATION: Atomic upload completion with storage coordination
 * 
 * PURPOSE:
 * - Eliminate race conditions between file upload and Firestore status updates
 * - Ensure either BOTH operations succeed or BOTH are rolled back
 * - Provide robust retry logic with exponential backoff + jitter
 * - Handle transaction conflicts gracefully
 * 
 * INTEGRATION PATTERN:
 * 1. Upload file to Storage (existing retry logic)
 * 2. Execute Firestore transaction for status update
 * 3. If transaction fails → clean up uploaded file
 * 4. If storage cleanup fails → log but preserve original error
 */

import { doc, runTransaction } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db } from '../../config/firebase';
import { storage } from '../../config/firebase';
import { createError, UPLOAD_ERRORS } from '../../utils/errors';

/**
 * Atomic recording completion with storage coordination
 * Either ALL operations succeed or ALL are rolled back
 * 
 * @param {string} sessionId - Recording session document ID
 * @param {Object} completionData - File metadata and completion info
 * @param {string} uploadedFilePath - Storage path of uploaded file
 * @returns {Promise<{success: boolean}>}
 */
export async function completeRecordingAtomically(sessionId, completionData, uploadedFilePath) {
  const sessionRef = doc(db, 'recordingSessions', sessionId);
  let shouldCleanupStorage = false;
  
  try {
    // Execute atomic transaction for ALL recording completion fields
    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      
      // Validation: Ensure session exists and is in valid state
      if (!sessionDoc.exists()) {
        throw createError(
          UPLOAD_ERRORS.RECORDING_NOT_FOUND,
          `Recording session ${sessionId} not found`,
          { sessionId }
        );
      }
      
      const currentData = sessionDoc.data();
      if (!['Recording', 'Uploading'].includes(currentData.status)) {
        throw createError(
          UPLOAD_ERRORS.INVALID_STATE,
          `Invalid session state for completion: ${currentData.status}`,
          { sessionId, currentStatus: currentData.status, expectedStatus: ['Recording', 'Uploading'] }
        );
      }
      
      // Atomic update of ALL completion fields
      transaction.update(sessionRef, {
        status: 'ReadyForTranscription',
        'storagePaths.finalVideo': uploadedFilePath,
        'recordingData.uploadProgress': 100,
        'recordingData.fileSize': completionData.fileSize,
        'recordingData.mimeType': completionData.mimeType,
        recordingCompletedAt: new Date(),
        updatedAt: new Date(),
        // Clear any previous errors
        error: null
      });
      
      console.log(`✅ Transaction prepared for session ${sessionId}`);
    });
    
    console.log(`✅ Recording ${sessionId} completed atomically`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Atomic completion failed for ${sessionId}:`, error);
    
    // CRITICAL: Flag storage for cleanup since transaction failed
    shouldCleanupStorage = true;
    throw error;
    
  } finally {
    // Cleanup uploaded file if transaction failed
    if (shouldCleanupStorage && uploadedFilePath) {
      try {
        await cleanupUploadedFile(uploadedFilePath);
        console.log(`🧹 Cleaned up uploaded file: ${uploadedFilePath}`);
      } catch (cleanupError) {
        console.error(`⚠️ Storage cleanup failed for ${uploadedFilePath}:`, cleanupError);
        // Don't throw - we want to preserve the original transaction error
      }
    }
  }
}

/**
 * Enhanced retry logic with exponential backoff and jitter
 * Prevents thundering herd problems with randomized delays
 * 
 * @param {Function} operation - Async operation to retry
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @param {number} baseDelay - Base delay in milliseconds (default: 1000)
 * @returns {Promise<any>} Result of successful operation
 */
export async function executeWithRetry(operation, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`✅ Operation succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw createError(
          UPLOAD_ERRORS.MAX_RETRIES_EXCEEDED,
          `Operation failed after ${maxRetries} attempts: ${error.message}`,
          { originalError: error.message, attempts: maxRetries }
        );
      }
      
      // Exponential backoff with jitter to prevent thundering herd
      const delay = Math.pow(2, attempt - 1) * baseDelay;
      const jitter = Math.random() * 500; // 0-500ms random jitter
      const totalDelay = delay + jitter;
      
      console.log(`⏳ Retrying in ${Math.round(totalDelay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
}

/**
 * Handle Firestore transaction conflicts with smart retry
 * Transaction conflicts resolve quickly, so use shorter delays
 * 
 * @param {Function} transactionFn - Transaction function to execute
 * @param {number} maxRetries - Maximum conflict retries (default: 5)
 * @returns {Promise<any>} Result of successful transaction
 */
export async function handleTransactionConflicts(transactionFn, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await transactionFn();
      if (attempt > 1) {
        console.log(`✅ Transaction resolved after ${attempt} attempts`);
      }
      return result;
    } catch (error) {
      // Check if error is a transaction conflict/abort
      if (error.code === 'aborted' && attempt < maxRetries) {
        console.warn(`⚠️ Transaction conflict (attempt ${attempt}), retrying...`);
        
        // Shorter delay for conflicts (they resolve quickly)
        const delay = Math.min(100 * attempt, 1000); // Max 1s delay
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error; // Re-throw if not a conflict or max retries reached
    }
  }
}

/**
 * Enhanced atomic completion with transaction conflict handling
 * Combines atomic completion with smart conflict resolution
 * 
 * @param {string} sessionId - Recording session document ID
 * @param {Object} completionData - File metadata and completion info
 * @param {string} uploadedFilePath - Storage path of uploaded file
 * @returns {Promise<{success: boolean}>}
 */
export async function completeRecordingWithConflictHandling(sessionId, completionData, uploadedFilePath) {
  return await handleTransactionConflicts(async () => {
    return await completeRecordingAtomically(sessionId, completionData, uploadedFilePath);
  });
}

/**
 * Storage cleanup utility - removes orphaned files after transaction failures
 * Safely handles non-existent files and Firebase Storage errors
 * 
 * @param {string} filePath - Storage path to clean up
 * @returns {Promise<void>}
 */
async function cleanupUploadedFile(filePath) {
  try {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    console.log(`🗑️ Successfully deleted orphaned file: ${filePath}`);
  } catch (error) {
    // Handle "file not found" gracefully (may have been cleaned up already)
    if (error.code === 'storage/object-not-found') {
      console.log(`ℹ️ File already deleted or not found: ${filePath}`);
      return;
    }
    
    // Re-throw other storage errors for visibility
    throw createError(
      UPLOAD_ERRORS.CLEANUP_FAILED,
      `Failed to clean up uploaded file: ${error.message}`,
      { filePath, originalError: error.message }
    );
  }
}

/**
 * Transaction-safe status update with validation
 * Validates status transitions and prevents invalid state changes
 * 
 * @param {string} sessionId - Recording session document ID
 * @param {string} newStatus - New status to set
 * @param {Object} additionalFields - Additional fields to update
 * @returns {Promise<{previousStatus: string, newStatus: string}>}
 */
export async function updateRecordingStatusAtomic(sessionId, newStatus, additionalFields = {}) {
  return await handleTransactionConflicts(async () => {
    const sessionRef = doc(db, 'recordingSessions', sessionId);
    
    return await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      
      if (!sessionDoc.exists()) {
        throw createError(
          UPLOAD_ERRORS.RECORDING_NOT_FOUND,
          `Recording session ${sessionId} not found`,
          { sessionId }
        );
      }
      
      const currentData = sessionDoc.data();
      
      // Validate status transition (prevent invalid state changes)
      const validTransitions = {
        'ReadyForRecording': ['Recording', 'failed'],
        'Recording': ['Uploading', 'failed'],
        'Uploading': ['ReadyForTranscription', 'failed'],
        'ReadyForTranscription': ['Transcribed', 'failed'],
        'failed': ['ReadyForRecording'] // Allow retry from failed state
      };
      
      const allowedStates = validTransitions[currentData.status] || [];
      if (!allowedStates.includes(newStatus)) {
        throw createError(
          UPLOAD_ERRORS.INVALID_STATE_TRANSITION,
          `Invalid status transition: ${currentData.status} → ${newStatus}`,
          { 
            sessionId, 
            currentStatus: currentData.status, 
            requestedStatus: newStatus, 
            allowedStates 
          }
        );
      }
      
      // Prepare update data
      const updateData = {
        status: newStatus,
        updatedAt: new Date(),
        ...additionalFields
      };
      
      transaction.update(sessionRef, updateData);
      
      console.log(`✅ Status updated: ${currentData.status} → ${newStatus} for session ${sessionId}`);
      
      return { previousStatus: currentData.status, newStatus };
    });
  });
}