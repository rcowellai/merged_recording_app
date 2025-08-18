// ----------------------------------------------------------
// localRecordingService.js - LOCAL STORAGE IMPLEMENTATION
// ----------------------------------------------------------
//
// This file provides local storage implementations for recording
// services. Recordings are stored in browser localStorage with
// blob URLs for playback. No server or network connection needed.
//
// ----------------------------------------------------------

import { 
  safeParseJSON, 
  validateStorageData, 
  createError, 
  classifyStorageError,
  UPLOAD_ERRORS,
  STORAGE_ERRORS 
} from '../utils/errors';
import { SERVICE_CONFIG } from '../config';

// Local storage keys (now from configuration)
const RECORDINGS_KEY = SERVICE_CONFIG.LOCAL_STORAGE.RECORDINGS_KEY;
const BLOB_STORAGE_KEY = SERVICE_CONFIG.LOCAL_STORAGE.BLOB_STORAGE_KEY;

// Simulate server timestamp
const serverTimestamp = () => new Date().toISOString();

// Helper to get recordings from localStorage with structured error handling
function getStoredRecordings() {
  try {
    const stored = localStorage.getItem(RECORDINGS_KEY);
    if (!stored) {
      return [];
    }
    
    const parsed = safeParseJSON(stored, []);
    
    // Validate data structure
    if (!validateStorageData(parsed)) {
      console.warn('Invalid recordings data structure, returning empty array');
      return [];
    }
    
    return parsed;
  } catch (error) {
    const errorType = classifyStorageError(error);
    const structuredError = createError(
      errorType === STORAGE_ERRORS.QUOTA_EXCEEDED ? UPLOAD_ERRORS.QUOTA_EXCEEDED : UPLOAD_ERRORS.UNKNOWN,
      'Failed to retrieve recordings from storage',
      error
    );
    console.error('Storage error in getStoredRecordings:', structuredError);
    return [];
  }
}

// Helper to save recordings to localStorage with structured error handling
function saveRecordings(recordings) {
  try {
    // Validate input data
    if (!validateStorageData(recordings)) {
      throw new Error('Invalid recordings data structure');
    }
    
    localStorage.setItem(RECORDINGS_KEY, JSON.stringify(recordings));
  } catch (error) {
    const errorType = classifyStorageError(error);
    const structuredError = createError(
      errorType === STORAGE_ERRORS.QUOTA_EXCEEDED ? UPLOAD_ERRORS.QUOTA_EXCEEDED : UPLOAD_ERRORS.UNKNOWN,
      'Failed to save recordings to storage',
      error
    );
    console.error('Storage error in saveRecordings:', structuredError);
    throw structuredError;
  }
}

// Helper to store blob URL with structured error handling
function storeBlobUrl(docId, blobUrl) {
  try {
    if (!docId || !blobUrl || typeof docId !== 'string' || typeof blobUrl !== 'string') {
      throw new Error('Invalid docId or blobUrl parameters');
    }
    
    const stored = localStorage.getItem(BLOB_STORAGE_KEY) || '{}';
    let blobs = safeParseJSON(stored, {});
    
    // Validate blob storage structure
    if (!validateStorageData(blobs)) {
      console.warn('Invalid blob storage data, resetting to empty object');
      blobs = {};
    }
    
    blobs[docId] = blobUrl;
    localStorage.setItem(BLOB_STORAGE_KEY, JSON.stringify(blobs));
  } catch (error) {
    const errorType = classifyStorageError(error);
    const structuredError = createError(
      errorType === STORAGE_ERRORS.QUOTA_EXCEEDED ? UPLOAD_ERRORS.QUOTA_EXCEEDED : UPLOAD_ERRORS.UNKNOWN,
      'Failed to store blob URL',
      error
    );
    console.error('Storage error in storeBlobUrl:', structuredError);
    // Don't throw here to maintain existing behavior of continuing without blob URL
  }
}

// Helper to get blob URL with structured error handling
function getBlobUrl(docId) {
  try {
    if (!docId || typeof docId !== 'string') {
      return null;
    }
    
    const stored = localStorage.getItem(BLOB_STORAGE_KEY) || '{}';
    const blobs = safeParseJSON(stored, {});
    
    // Validate blob storage structure
    if (!validateStorageData(blobs)) {
      console.warn('Invalid blob storage data structure');
      return null;
    }
    
    return blobs[docId] || null;
  } catch (error) {
    const structuredError = createError(
      UPLOAD_ERRORS.UNKNOWN,
      'Failed to retrieve blob URL',
      error
    );
    console.error('Storage error in getBlobUrl:', structuredError);
    return null;
  }
}

/**
 * Fetch a single recording document by ID (LOCAL VERSION).
 * @param {string} docId Local recording ID
 * @returns {Promise<Object|null>} The recording data or null if not found
 */
export async function fetchRecording(docId) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, SERVICE_CONFIG.LOCAL_STORAGE.FETCH_DELAY_MS));
  
  try {
    const recordings = getStoredRecordings();
    const recording = recordings.find(r => r.id === docId);
    
    if (!recording) {
      return null;
    }
    
    // Get the stored blob URL
    const downloadURL = getBlobUrl(docId);
    
    return {
      ...recording,
      downloadURL: downloadURL || recording.downloadURL
    };
  } catch (err) {
    console.error('Error in fetchRecording:', err);
    throw err;
  }
}

/**
 * Fetch all recordings (LOCAL VERSION).
 * @returns {Promise<Array>} Array of recording objects
 */
export async function fetchAllRecordings() {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, SERVICE_CONFIG.LOCAL_STORAGE.FETCH_DELAY_MS));
  
  try {
    const recordings = getStoredRecordings();
    console.log('📦 Local recordings found:', recordings.length);
    return recordings;
  } catch (err) {
    console.error('Error in fetchAllRecordings:', err);
    throw err;
  }
}

/**
 * Upload a blob (LOCAL VERSION - stores in browser).
 * Simulates upload process with progress callbacks for smooth UX.
 *
 * @param {Blob} blob        The recording blob
 * @param {string} fileName  The desired file name
 * @param {string} fileType  'audio' or 'video'
 * @param {function} onProgress A callback for upload progress (fraction)
 * @param {string} [actualMimeType] Optional actual mime type
 * @returns {Promise<{ docId: string, downloadURL: string }>}
 */
export async function uploadRecording(
  blob,
  fileName,
  fileType,
  onProgress,
  actualMimeType
) {
  return new Promise((resolve) => {
    try {
      console.log('🚀 Local upload started:', fileName, fileType);
      
      // Create blob URL for local playback
      const downloadURL = URL.createObjectURL(blob);
      
      // Generate unique doc ID
      const docId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Simulate upload progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 0.3;
        if (progress > 1) progress = 1;
        
        if (onProgress) {
          onProgress(progress);
        }
        
        if (progress >= 1) {
          clearInterval(progressInterval);
          
          try {
            // Store the recording metadata
            const recordings = getStoredRecordings();
            const newRecording = {
              id: docId,
              downloadURL,
              fileType,
              fileName,
              createdAt: serverTimestamp(),
              // Add some demo metadata
              size: blob.size,
              mimeType: actualMimeType || blob.type
            };
            
            recordings.push(newRecording);
            saveRecordings(recordings);
            
            // Store blob URL separately for retrieval
            storeBlobUrl(docId, downloadURL);
            
            console.log('✅ Local upload complete:', { docId, fileName });
            resolve({ docId, downloadURL });
          } catch (saveError) {
            const structuredError = createError(
              UPLOAD_ERRORS.UNKNOWN,
              'Failed to save recording metadata',
              saveError
            );
            console.error('Upload error during save:', structuredError);
            resolve({ 
              docId: 'error_' + Date.now(), 
              downloadURL: URL.createObjectURL(blob) 
            });
          }
        }
      }, SERVICE_CONFIG.LOCAL_STORAGE.UPLOAD_PROGRESS_INTERVAL_MS);
      
    } catch (err) {
      console.error('Error in local uploadRecording:', err);
      resolve({ 
        docId: 'error_' + Date.now(), 
        downloadURL: URL.createObjectURL(blob) 
      });
    }
  });
}

// Helper function to clear all local recordings (useful for testing)
export function clearAllLocalRecordings() {
  localStorage.removeItem(RECORDINGS_KEY);
  localStorage.removeItem(BLOB_STORAGE_KEY);
  console.log('🗑️ All local recordings cleared');
}

// Helper function to get storage stats
export function getLocalStorageStats() {
  const recordings = getStoredRecordings();
  const totalSize = recordings.reduce((sum, r) => sum + (r.size || 0), 0);
  
  return {
    count: recordings.length,
    totalSize,
    recordings
  };
}

console.log('📱 Local Recording Service: ENABLED');
console.log('💾 Recordings will be stored in browser localStorage');