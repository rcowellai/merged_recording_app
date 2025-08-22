/**
 * useProgressiveUpload.test.js
 * ----------------------------
 * SLICE-D: Unit tests for progressive upload hook and chunking logic
 * Tests progressive chunk upload, error handling, and Love Retold integration
 */

import { renderHook, act } from '@testing-library/react';
import { useProgressiveUpload } from './useProgressiveUpload';
import { storage } from '../config/firebase';
import { uploadErrorTracker } from '../utils/uploadErrorTracker';

// Mock Firebase modules
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock('../config/firebase', () => ({
  storage: {}
}));

jest.mock('../utils/firebaseErrorHandler', () => ({
  firebaseErrorHandler: {
    withRetry: jest.fn((fn) => fn()),
    mapError: jest.fn((error) => error),
  }
}));

jest.mock('../utils/uploadErrorTracker', () => ({
  uploadErrorTracker: {
    logInfo: jest.fn(),
    logError: jest.fn(),
  }
}));

// Mock Firebase imports
const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');

describe('useProgressiveUpload', () => {
  // Test data
  const mockSessionId = 'test-session-123';
  const mockSessionComponents = {
    userId: 'truncated-user-id',
    promptId: 'prompt-123',
    storytellerId: 'storyteller-123'
  };
  const mockSessionData = {
    fullUserId: 'full-28-character-user-id-123',
    sessionDocument: { status: 'active' }
  };

  const createMockBlob = (size = 1024) => {
    return new Blob(['x'.repeat(size)], { type: 'audio/webm' });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Firebase mocks
    ref.mockReturnValue({ fullPath: 'mock/path' });
    uploadBytes.mockResolvedValue({ 
      ref: { fullPath: 'mock/path' } 
    });
    getDownloadURL.mockResolvedValue('https://mock-download-url.com');
  });

  describe('Initialization', () => {
    test('should initialize with correct default state', () => {
      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      expect(result.current.uploadProgress).toBe(0);
      expect(result.current.chunksUploaded).toBe(0);
      expect(result.current.totalChunks).toBe(0);
      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadError).toBe(null);
    });

    test('should provide required functions', () => {
      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      expect(typeof result.current.processRecordingChunk).toBe('function');
      expect(typeof result.current.finalizeUpload).toBe('function');
      expect(typeof result.current.cleanup).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.getUploadedChunks).toBe('function');
      expect(typeof result.current.getTotalSize).toBe('function');
    });
  });

  describe('Chunk Processing', () => {
    test('should process recording chunks successfully', async () => {
      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      const mockBlob = createMockBlob(2048);

      await act(async () => {
        const result1 = await result.current.processRecordingChunk(mockBlob);
        expect(result1.success).toBe(true);
      });

      expect(result.current.chunksUploaded).toBe(1);
      expect(result.current.totalChunks).toBe(1);
      expect(uploadBytes).toHaveBeenCalledWith(
        expect.objectContaining({ fullPath: 'mock/path' }),
        mockBlob
      );
    });

    test('should handle multiple chunks sequentially', async () => {
      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      const chunk1 = createMockBlob(1024);
      const chunk2 = createMockBlob(2048);
      const chunk3 = createMockBlob(512);

      await act(async () => {
        await result.current.processRecordingChunk(chunk1);
        await result.current.processRecordingChunk(chunk2);
        await result.current.processRecordingChunk(chunk3);
      });

      expect(result.current.chunksUploaded).toBe(3);
      expect(result.current.totalChunks).toBe(3);
      expect(result.current.getTotalSize()).toBe(3584); // 1024 + 2048 + 512
    });

    test('should use full userId from sessionData (Slice A preservation)', async () => {
      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      const mockBlob = createMockBlob(1024);

      await act(async () => {
        await result.current.processRecordingChunk(mockBlob);
      });

      expect(ref).toHaveBeenCalledWith(
        storage,
        `users/${mockSessionData.fullUserId}/recordings/${mockSessionId}/chunks/chunk_0.webm`
      );
    });

    test('should fallback to truncated userId if fullUserId not available', async () => {
      const sessionDataWithoutFullUserId = { ...mockSessionData };
      delete sessionDataWithoutFullUserId.fullUserId;

      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, sessionDataWithoutFullUserId)
      );

      const mockBlob = createMockBlob(1024);

      await act(async () => {
        await result.current.processRecordingChunk(mockBlob);
      });

      expect(ref).toHaveBeenCalledWith(
        storage,
        `users/${mockSessionComponents.userId}/recordings/${mockSessionId}/chunks/chunk_0.webm`
      );
    });

    test('should handle empty chunks gracefully', async () => {
      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      const emptyBlob = new Blob([], { type: 'audio/webm' });

      await act(async () => {
        const uploadResult = await result.current.processRecordingChunk(emptyBlob);
        expect(uploadResult.success).toBe(false);
        expect(uploadResult.error).toBe('Empty chunk');
      });

      expect(result.current.chunksUploaded).toBe(0);
      expect(uploadBytes).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle upload failures gracefully', async () => {
      const uploadError = new Error('Network error');
      uploadBytes.mockRejectedValueOnce(uploadError);

      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      const mockBlob = createMockBlob(1024);

      await act(async () => {
        const uploadResult = await result.current.processRecordingChunk(mockBlob);
        expect(uploadResult.success).toBe(false);
        expect(uploadResult.error).toBeDefined();
      });

      expect(result.current.uploadError).toBeDefined();
      expect(uploadErrorTracker.logError).toHaveBeenCalledWith(
        'Progressive chunk upload failed',
        expect.any(Error),
        expect.objectContaining({
          sessionId: mockSessionId,
          fullUserId: mockSessionData.fullUserId
        })
      );
    });

    test('should track customer support information on errors', async () => {
      const uploadError = new Error('Storage quota exceeded');
      uploadBytes.mockRejectedValueOnce(uploadError);

      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      const mockBlob = createMockBlob(1024);

      await act(async () => {
        await result.current.processRecordingChunk(mockBlob);
      });

      expect(uploadErrorTracker.logError).toHaveBeenCalledWith(
        'Progressive chunk upload failed',
        uploadError,
        expect.objectContaining({
          sessionId: mockSessionId,
          fullUserId: mockSessionData.fullUserId,
          truncatedUserId: mockSessionComponents.userId,
          step: 'chunk_0_error',
          chunkSize: 1024,
          chunkIndex: 0
        })
      );
    });
  });

  describe('Upload Finalization', () => {
    test('should finalize upload with correct metadata', async () => {
      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      // Upload some chunks first
      await act(async () => {
        await result.current.processRecordingChunk(createMockBlob(1024));
        await result.current.processRecordingChunk(createMockBlob(2048));
      });

      await act(async () => {
        const finalizeResult = await result.current.finalizeUpload();
        
        expect(finalizeResult.success).toBe(true);
        expect(finalizeResult.storagePath).toBe(
          `users/${mockSessionData.fullUserId}/recordings/${mockSessionId}/final/recording.webm`
        );
        expect(finalizeResult.metadata).toMatchObject({
          totalChunks: 2,
          combinedSize: 3072,
          uploadMethod: 'progressive-chunks',
          sessionId: mockSessionId,
          fullUserId: mockSessionData.fullUserId
        });
      });
    });

    test('should include Love Retold integration fields in metadata', async () => {
      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      await act(async () => {
        await result.current.processRecordingChunk(createMockBlob(1024));
      });

      await act(async () => {
        const finalizeResult = await result.current.finalizeUpload();
        
        expect(finalizeResult.metadata).toMatchObject({
          sessionId: mockSessionId,
          fullUserId: mockSessionData.fullUserId,
          sessionComponents: mockSessionComponents,
          uploadMethod: 'progressive-chunks'
        });
      });
    });
  });

  describe('State Management', () => {
    test('should update progress correctly during uploads', async () => {
      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      await act(async () => {
        await result.current.processRecordingChunk(createMockBlob(1024));
      });

      expect(result.current.uploadProgress).toBeGreaterThan(0);
      expect(result.current.chunksUploaded).toBe(1);
      expect(result.current.totalChunks).toBe(1);
    });

    test('should reset state correctly', async () => {
      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      // Upload some chunks and set error state
      await act(async () => {
        await result.current.processRecordingChunk(createMockBlob(1024));
      });

      expect(result.current.chunksUploaded).toBe(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.uploadProgress).toBe(0);
      expect(result.current.chunksUploaded).toBe(0);
      expect(result.current.totalChunks).toBe(0);
      expect(result.current.uploadError).toBe(null);
      expect(result.current.isUploading).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup uploaded chunks on failure', async () => {
      const mockDelete = jest.fn().mockResolvedValue();
      const mockRef = { 
        fullPath: 'mock/path', 
        delete: mockDelete 
      };
      
      uploadBytes.mockResolvedValue({ ref: mockRef });

      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      // Upload some chunks
      await act(async () => {
        await result.current.processRecordingChunk(createMockBlob(1024));
        await result.current.processRecordingChunk(createMockBlob(2048));
      });

      await act(async () => {
        await result.current.cleanup();
      });

      expect(mockDelete).toHaveBeenCalledTimes(2);
      expect(result.current.chunksUploaded).toBe(0);
      expect(result.current.uploadProgress).toBe(0);
    });
  });

  describe('Integration with RECORDING_LIMITS', () => {
    test('should respect chunk size limits from configuration', async () => {
      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      // Test with large chunk (should still work but size should be tracked)
      const largeBlob = createMockBlob(15 * 1024 * 1024); // 15MB

      await act(async () => {
        const uploadResult = await result.current.processRecordingChunk(largeBlob);
        expect(uploadResult.success).toBe(true);
      });

      expect(result.current.getTotalSize()).toBe(15 * 1024 * 1024);
    });
  });

  describe('Love Retold Integration Preservation', () => {
    test('should preserve Slice A userId requirements', async () => {
      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      await act(async () => {
        await result.current.processRecordingChunk(createMockBlob(1024));
      });

      // Verify full userId is used in storage path
      expect(ref).toHaveBeenCalledWith(
        storage,
        expect.stringContaining(mockSessionData.fullUserId)
      );
      expect(ref).toHaveBeenCalledWith(
        storage,
        expect.not.stringContaining(mockSessionComponents.userId)
      );
    });

    test('should track customer support information (Slice C preservation)', async () => {
      const { result } = renderHook(() => 
        useProgressiveUpload(mockSessionId, mockSessionComponents, mockSessionData)
      );

      await act(async () => {
        await result.current.processRecordingChunk(createMockBlob(1024));
      });

      expect(uploadErrorTracker.logInfo).toHaveBeenCalledWith(
        'Progressive chunk upload completed',
        expect.objectContaining({
          sessionId: mockSessionId,
          fullUserId: mockSessionData.fullUserId,
          truncatedUserId: mockSessionComponents.userId
        })
      );
    });
  });
});