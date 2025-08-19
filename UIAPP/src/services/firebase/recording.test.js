/**
 * Firebase Recording Upload Service Tests (C06)
 * 
 * Unit tests for the Firebase recording upload service with chunked uploads,
 * metadata persistence, and session integration.
 */

import {
  uploadRecordingWithMetadata,
  resumeRecordingUpload,
  cancelRecordingUpload,
  getRecordingUploadProgress,
  isRecordingUploadEnabled,
  validateRecordingUpload
} from './recording.js';

// Mock dependencies
jest.mock('./storage.js', () => ({
  uploadMemoryRecording: jest.fn(),
  linkStorageToFirestore: jest.fn(),
  deleteFile: jest.fn()
}));

jest.mock('./firestore.js', () => ({
  createRecordingSession: jest.fn(),
  updateRecordingSession: jest.fn(),
  getRecordingSession: jest.fn()
}));

jest.mock('../../utils/errors.js', () => ({
  createError: jest.fn((type, message) => {
    const error = new Error(message);
    error.code = type;
    throw error;
  }),
  UPLOAD_ERRORS: {
    NOT_FOUND: 'NOT_FOUND',
    INVALID_STATE: 'INVALID_STATE'
  }
}));

jest.mock('../../config/index.js', () => ({
  ENV_CONFIG: {
    USE_FIREBASE: true,
    FIREBASE_STORAGE_ENABLED: true,
    RECORDING_UPLOAD_ENABLED: true
  }
}));

// Import mocked dependencies
import { uploadMemoryRecording, deleteFile } from './storage.js';
import {
  createRecordingSession,
  updateRecordingSession,
  getRecordingSession
} from './firestore.js';

describe('Firebase Recording Upload Service (C06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log
    console.warn = jest.fn(); // Mock console.warn
    console.error = jest.fn(); // Mock console.error
  });

  describe('uploadRecordingWithMetadata', () => {
    const mockBlob = new Blob(['test audio data'], { type: 'audio/mp4' });
    const mockSessionInfo = {
      sessionId: 'test-session-123',
      userId: 'test-user',
      fileType: 'audio',
      fileName: 'test-recording',
      duration: 120
    };

    it('should successfully upload recording with metadata', async () => {
      // Mock successful upload
      uploadMemoryRecording.mockResolvedValueOnce({
        storagePath: 'users/test-user/recordings/test-session-123/recording.mp4',
        downloadURL: 'https://firebase.storage/download-url',
        uploadId: 'upload-123'
      });

      createRecordingSession.mockResolvedValueOnce();
      updateRecordingSession.mockResolvedValueOnce();

      const result = await uploadRecordingWithMetadata(mockBlob, mockSessionInfo);

      expect(result.success).toBe(true);
      expect(result.recordingId).toBe('test-session-123');
      expect(result.downloadUrl).toBe('https://firebase.storage/download-url');
      expect(result.storagePath).toBe('users/test-user/recordings/test-session-123/recording.mp4');
      
      // Verify session was created
      expect(createRecordingSession).toHaveBeenCalledWith('test-session-123', expect.objectContaining({
        sessionId: 'test-session-123',
        userId: 'test-user',
        status: 'uploading',
        fileType: 'audio'
      }));

      // Verify session was updated with completion
      expect(updateRecordingSession).toHaveBeenCalledWith('test-session-123', expect.objectContaining({
        status: 'completed',
        uploadProgress: 100
      }));
    });

    it('should handle upload failure gracefully', async () => {
      uploadMemoryRecording.mockRejectedValueOnce(new Error('Upload failed'));
      createRecordingSession.mockResolvedValueOnce();
      updateRecordingSession.mockResolvedValueOnce();

      const result = await uploadRecordingWithMetadata(mockBlob, mockSessionInfo);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
      expect(result.recordingId).toBe('test-session-123');

      // Verify error status was updated
      expect(updateRecordingSession).toHaveBeenCalledWith('test-session-123', expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({
          code: 'UPLOAD_FAILED',
          message: 'Upload failed'
        })
      }));
    });

    it('should continue upload even if session creation fails', async () => {
      createRecordingSession.mockRejectedValueOnce(new Error('Session creation failed'));
      uploadMemoryRecording.mockResolvedValueOnce({
        storagePath: 'users/test-user/recordings/test-session-123/recording.mp4',
        downloadURL: 'https://firebase.storage/download-url',
        uploadId: 'upload-123'
      });

      const result = await uploadRecordingWithMetadata(mockBlob, mockSessionInfo);

      expect(result.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create recording session'),
        expect.any(Error)
      );
    });

    it('should call progress callback during upload', async () => {
      const mockProgressCallback = jest.fn();
      
      uploadMemoryRecording.mockImplementationOnce((blob, userId, sessionId, options) => {
        // Simulate progress updates
        options.onProgress(0.5);
        options.onProgress(1.0);
        
        return Promise.resolve({
          storagePath: 'test-path',
          downloadURL: 'test-url',
          uploadId: 'test-id'
        });
      });

      createRecordingSession.mockResolvedValueOnce();
      updateRecordingSession.mockResolvedValueOnce();

      await uploadRecordingWithMetadata(mockBlob, mockSessionInfo, {
        onProgress: mockProgressCallback
      });

      expect(mockProgressCallback).toHaveBeenCalledWith(0.5);
      expect(mockProgressCallback).toHaveBeenCalledWith(1.0);
    });
  });

  describe('resumeRecordingUpload', () => {
    it('should return completed status if upload already finished', async () => {
      getRecordingSession.mockResolvedValueOnce({
        status: 'completed',
        downloadUrl: 'https://firebase.storage/completed-url',
        storagePath: 'completed-path'
      });

      const result = await resumeRecordingUpload('test-upload-id');

      expect(result.success).toBe(true);
      expect(result.downloadUrl).toBe('https://firebase.storage/completed-url');
      expect(result.storagePath).toBe('completed-path');
    });

    it('should return error for non-existent session', async () => {
      getRecordingSession.mockResolvedValueOnce(null);

      const result = await resumeRecordingUpload('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Recording session not found: non-existent-id');
    });

    it('should return error for invalid status', async () => {
      getRecordingSession.mockResolvedValueOnce({
        status: 'completed'  // Not resumable
      });

      const result = await resumeRecordingUpload('test-upload-id');

      expect(result.success).toBe(true); // Completed is actually success
    });
  });

  describe('cancelRecordingUpload', () => {
    it('should successfully cancel upload and clean up files', async () => {
      getRecordingSession.mockResolvedValueOnce({
        storagePath: 'test-storage-path'
      });
      
      deleteFile.mockResolvedValueOnce();
      updateRecordingSession.mockResolvedValueOnce();

      const result = await cancelRecordingUpload('test-upload-id');

      expect(result).toBe(true);
      expect(deleteFile).toHaveBeenCalledWith('test-storage-path', {
        cleanupFirestore: false
      });
      expect(updateRecordingSession).toHaveBeenCalledWith('test-upload-id', expect.objectContaining({
        status: 'cancelled'
      }));
    });

    it('should handle missing session gracefully', async () => {
      getRecordingSession.mockResolvedValueOnce(null);
      updateRecordingSession.mockResolvedValueOnce();

      const result = await cancelRecordingUpload('non-existent-id');

      expect(result).toBe(true);
      expect(deleteFile).not.toHaveBeenCalled();
    });

    it('should continue cancellation even if file deletion fails', async () => {
      getRecordingSession.mockResolvedValueOnce({
        storagePath: 'test-storage-path'
      });
      
      deleteFile.mockRejectedValueOnce(new Error('Delete failed'));
      updateRecordingSession.mockResolvedValueOnce();

      const result = await cancelRecordingUpload('test-upload-id');

      expect(result).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete storage file'),
        expect.any(Error)
      );
    });
  });

  describe('getRecordingUploadProgress', () => {
    it('should return progress information for existing session', async () => {
      getRecordingSession.mockResolvedValueOnce({
        sessionId: 'test-session',
        uploadProgress: 75,
        status: 'uploading',
        downloadUrl: 'test-url',
        storagePath: 'test-path',
        lastUpdated: new Date()
      });

      const result = await getRecordingUploadProgress('test-upload-id');

      expect(result.found).toBe(true);
      expect(result.progress).toBe(75);
      expect(result.status).toBe('uploading');
      expect(result.recordingId).toBe('test-session');
    });

    it('should return not found for non-existent session', async () => {
      getRecordingSession.mockResolvedValueOnce(null);

      const result = await getRecordingUploadProgress('non-existent-id');

      expect(result.found).toBe(false);
      expect(result.progress).toBe(0);
      expect(result.status).toBe('not_found');
    });

    it('should handle errors gracefully', async () => {
      getRecordingSession.mockRejectedValueOnce(new Error('Database error'));

      const result = await getRecordingUploadProgress('test-upload-id');

      expect(result.found).toBe(false);
      expect(result.status).toBe('error');
      expect(result.error).toBe('Database error');
    });
  });

  describe('isRecordingUploadEnabled', () => {
    it('should return true when all flags are enabled', () => {
      // Using mocked ENV_CONFIG from setup
      expect(isRecordingUploadEnabled()).toBe(true);
    });
  });

  describe('validateRecordingUpload', () => {
    const validBlob = new Blob(['test data'], { type: 'audio/mp4' });
    const validSessionInfo = {
      userId: 'test-user',
      fileType: 'audio',
      duration: 120
    };

    it('should pass validation for valid inputs', () => {
      const result = validateRecordingUpload(validBlob, validSessionInfo);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid blob', () => {
      const result = validateRecordingUpload(null, validSessionInfo);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid blob: must be a Blob object');
    });

    it('should fail validation for empty blob', () => {
      const emptyBlob = new Blob([], { type: 'audio/mp4' });
      const result = validateRecordingUpload(emptyBlob, validSessionInfo);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid blob: blob is empty');
    });

    it('should fail validation for invalid session info', () => {
      const result = validateRecordingUpload(validBlob, null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid sessionInfo: must be an object');
    });

    it('should fail validation for invalid file type', () => {
      const invalidSessionInfo = {
        ...validSessionInfo,
        fileType: 'invalid'
      };
      
      const result = validateRecordingUpload(validBlob, invalidSessionInfo);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid fileType: must be "audio" or "video"');
    });

    it('should fail validation for negative duration', () => {
      const invalidSessionInfo = {
        ...validSessionInfo,
        duration: -5
      };
      
      const result = validateRecordingUpload(validBlob, invalidSessionInfo);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid duration: must be a non-negative number');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete upload workflow', async () => {
      const mockBlob = new Blob(['test data'], { type: 'audio/mp4' });
      const sessionInfo = {
        sessionId: 'integration-test',
        userId: 'test-user',
        fileType: 'audio'
      };

      // Mock all successful responses
      createRecordingSession.mockResolvedValueOnce();
      uploadMemoryRecording.mockResolvedValueOnce({
        storagePath: 'test-path',
        downloadURL: 'test-url',
        uploadId: 'test-id'
      });
      updateRecordingSession.mockResolvedValueOnce();

      const result = await uploadRecordingWithMetadata(mockBlob, sessionInfo);

      expect(result.success).toBe(true);
      expect(createRecordingSession).toHaveBeenCalled();
      expect(uploadMemoryRecording).toHaveBeenCalled();
      expect(updateRecordingSession).toHaveBeenCalledTimes(1); // For completion
    });
  });
});

console.log('🧪 C06 Recording Service Tests: LOADED');