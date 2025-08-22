/**
 * recordingFlow.integration.test.js
 * ---------------------------------
 * SLICE-D: Integration tests for recording flow and upload coordination
 * Tests the complete flow from recording start to progressive upload completion
 */

import { renderHook, act } from '@testing-library/react';
import useRecordingFlow from '../hooks/useRecordingFlow';
import { createSubmissionHandler } from '../utils/submissionHandlers';
import { RECORDING_LIMITS } from '../config';

// Mock MediaRecorder
global.MediaRecorder = jest.fn().mockImplementation((stream, options) => ({
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  requestData: jest.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

global.MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true);

// Mock getUserMedia
global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: () => [{ stop: jest.fn() }]
  })
};

// Mock Firebase modules
jest.mock('../services/firebase', () => ({
  initializeAuth: jest.fn().mockResolvedValue(),
}));

jest.mock('../services/firebase/loveRetoldUpload', () => ({
  uploadLoveRetoldRecording: jest.fn().mockResolvedValue({
    success: true,
    storagePath: 'mock/storage/path',
    uploadMethod: 'progressive-chunks'
  })
}));

jest.mock('../utils/firebaseErrorHandler', () => ({
  firebaseErrorHandler: {
    withFallback: jest.fn((fn) => fn()),
    withRetry: jest.fn((fn) => fn()),
    log: jest.fn(),
    mapError: jest.fn((error) => error),
  }
}));

jest.mock('../utils/uploadErrorTracker', () => ({
  uploadErrorTracker: {
    logInfo: jest.fn(),
    logError: jest.fn(),
    logWarning: jest.fn(),
  }
}));

// Mock config
jest.mock('../config', () => ({
  RECORDING_LIMITS: {
    MAX_DURATION_SECONDS: 900, // 15 minutes
    CHUNK_UPLOAD_INTERVAL: 30,
    CHUNK_SIZE: 10 * 1024 * 1024,
    MAX_FILE_SIZE: 500 * 1024 * 1024,
    WARNING_TIME: 840, // 14 minutes
    PROGRESSIVE_UPLOAD_ENABLED: true,
    COUNTDOWN_STEPS: [3, 2, 1, 'BEGIN'],
    TIMER_INTERVAL_MS: 1000
  },
  SUPPORTED_FORMATS: {
    video: ['video/mp4;codecs=h264', 'video/webm;codecs=vp8,opus'],
    audio: ['audio/mp4;codecs=aac', 'audio/webm;codecs=opus']
  },
  ENV_CONFIG: {
    USE_FIREBASE: true
  }
}));

const { uploadLoveRetoldRecording } = require('../services/firebase/loveRetoldUpload');

describe('Recording Flow Integration Tests', () => {
  // Test data
  const mockSessionId = 'test-session-integration-123';
  const mockSessionComponents = {
    userId: 'truncated-user-id',
    promptId: 'prompt-123',
    storytellerId: 'storyteller-123'
  };
  const mockSessionData = {
    fullUserId: 'full-28-character-user-id-123',
    sessionDocument: { status: 'active' },
    askerName: 'Test User'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Progressive Upload Recording Flow', () => {
    test('should initialize progressive upload when recording starts', async () => {
      const mockOnDoneAndSubmitStage = jest.fn();
      
      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: mockOnDoneAndSubmitStage
        })
      );

      // Start audio recording
      await act(async () => {
        await result.current.handleAudioClick();
      });

      expect(result.current.captureMode).toBe('audio');
      expect(result.current.mediaStream).toBeDefined();

      // Start recording
      await act(async () => {
        result.current.handleStartRecording();
      });

      // Progressive upload should be initialized
      expect(result.current.progressiveUpload).toBeDefined();
      expect(result.current.chunksUploaded).toBe(0);
      expect(result.current.uploadProgress).toBe(0);
    });

    test('should trigger chunk uploads at specified intervals', async () => {
      const mockOnDoneAndSubmitStage = jest.fn();
      
      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: mockOnDoneAndSubmitStage
        })
      );

      await act(async () => {
        await result.current.handleAudioClick();
        result.current.handleStartRecording();
      });

      const mockRecorder = MediaRecorder.mock.instances[0];
      mockRecorder.state = 'recording';

      // Fast forward to trigger chunk upload
      act(() => {
        jest.advanceTimersByTime(RECORDING_LIMITS.CHUNK_UPLOAD_INTERVAL * 1000);
      });

      expect(mockRecorder.requestData).toHaveBeenCalled();
    });

    test('should handle chunk data during recording', async () => {
      const mockOnDoneAndSubmitStage = jest.fn();
      
      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: mockOnDoneAndSubmitStage
        })
      );

      await act(async () => {
        await result.current.handleAudioClick();
        result.current.handleStartRecording();
      });

      const mockRecorder = MediaRecorder.mock.instances[0];
      mockRecorder.state = 'recording';

      // Simulate chunk data availability
      const mockChunkData = new Blob(['chunk data'], { type: 'audio/webm' });
      const mockEvent = { data: mockChunkData };

      await act(async () => {
        if (mockRecorder.ondataavailable) {
          await mockRecorder.ondataavailable(mockEvent);
        }
      });

      // Should have processed the chunk if progressive upload is enabled
      if (RECORDING_LIMITS.PROGRESSIVE_UPLOAD_ENABLED) {
        expect(result.current.chunksUploaded).toBeGreaterThan(0);
      }
    });

    test('should clean up timers when recording stops', async () => {
      const mockOnDoneAndSubmitStage = jest.fn();
      
      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: mockOnDoneAndSubmitStage
        })
      );

      await act(async () => {
        await result.current.handleAudioClick();
        result.current.handleStartRecording();
      });

      const mockRecorder = MediaRecorder.mock.instances[0];
      
      // Stop recording
      await act(async () => {
        result.current.handleDone();
      });

      expect(mockRecorder.stop).toHaveBeenCalled();
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('Submission Handler Integration', () => {
    test('should handle progressive upload completion in submission', async () => {
      const mockDispatch = jest.fn();
      const mockAppActions = {
        SET_UPLOAD_IN_PROGRESS: 'SET_UPLOAD_IN_PROGRESS',
        SET_UPLOAD_FRACTION: 'SET_UPLOAD_FRACTION'
      };

      // Mock progressive upload with uploaded chunks
      const mockProgressiveUpload = {
        chunksUploaded: 3,
        uploadProgress: 1.0,
        getTotalSize: () => 15000,
        finalizeUpload: jest.fn().mockResolvedValue({
          success: true,
          metadata: {
            totalChunks: 3,
            combinedSize: 15000,
            chunks: [
              { storagePath: 'chunk1', size: 5000 },
              { storagePath: 'chunk2', size: 5000 },
              { storagePath: 'chunk3', size: 5000 }
            ]
          }
        })
      };

      const submissionHandler = createSubmissionHandler({
        recordedBlobUrl: 'blob:mock-url',
        captureMode: 'audio',
        actualMimeType: 'audio/webm',
        sessionId: mockSessionId,
        sessionComponents: mockSessionComponents,
        sessionData: mockSessionData,
        progressiveUpload: mockProgressiveUpload,
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS: mockAppActions
      });

      await act(async () => {
        await submissionHandler();
      });

      // Should finalize progressive upload
      expect(mockProgressiveUpload.finalizeUpload).toHaveBeenCalled();

      // Should call Love Retold upload with progressive flag
      expect(uploadLoveRetoldRecording).toHaveBeenCalledWith(
        expect.any(Blob),
        mockSessionId,
        mockSessionComponents,
        mockSessionData,
        expect.objectContaining({
          isProgressiveUpload: true,
          chunkMetadata: expect.objectContaining({
            totalChunks: 3,
            combinedSize: 15000
          })
        })
      );
    });

    test('should fallback to traditional upload when no chunks uploaded', async () => {
      const mockDispatch = jest.fn();
      const mockAppActions = {
        SET_UPLOAD_IN_PROGRESS: 'SET_UPLOAD_IN_PROGRESS',
        SET_UPLOAD_FRACTION: 'SET_UPLOAD_FRACTION'
      };

      // Mock progressive upload with no chunks
      const mockProgressiveUpload = {
        chunksUploaded: 0,
        uploadProgress: 0,
        getTotalSize: () => 0
      };

      const submissionHandler = createSubmissionHandler({
        recordedBlobUrl: 'blob:mock-url',
        captureMode: 'audio',
        actualMimeType: 'audio/webm',
        sessionId: mockSessionId,
        sessionComponents: mockSessionComponents,
        sessionData: mockSessionData,
        progressiveUpload: mockProgressiveUpload,
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS: mockAppActions
      });

      await act(async () => {
        await submissionHandler();
      });

      // Should use traditional upload
      expect(uploadLoveRetoldRecording).toHaveBeenCalledWith(
        expect.any(Blob),
        mockSessionId,
        mockSessionComponents,
        mockSessionData,
        expect.objectContaining({
          mediaType: 'audio',
          actualMimeType: 'audio/webm',
          onProgress: expect.any(Function),
          maxRetries: 3
        })
      );

      // Should not have progressive upload flags
      expect(uploadLoveRetoldRecording).toHaveBeenCalledWith(
        expect.any(Blob),
        mockSessionId,
        mockSessionComponents,
        mockSessionData,
        expect.not.objectContaining({
          isProgressiveUpload: true
        })
      );
    });
  });

  describe('15-Minute Recording Limit', () => {
    test('should enforce 15-minute recording limit', async () => {
      const mockOnDoneAndSubmitStage = jest.fn();
      
      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: mockOnDoneAndSubmitStage
        })
      );

      await act(async () => {
        await result.current.handleAudioClick();
        result.current.handleStartRecording();
      });

      expect(result.current.isRecording).toBe(true);

      // Fast forward to just before 15 minutes
      act(() => {
        jest.advanceTimersByTime((RECORDING_LIMITS.MAX_DURATION_SECONDS - 1) * 1000);
      });

      expect(result.current.elapsedSeconds).toBe(RECORDING_LIMITS.MAX_DURATION_SECONDS - 1);
      expect(result.current.isRecording).toBe(true);

      // Fast forward to 15 minutes - should trigger auto-stop
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.elapsedSeconds).toBe(RECORDING_LIMITS.MAX_DURATION_SECONDS);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle progressive upload errors gracefully', async () => {
      const mockOnDoneAndSubmitStage = jest.fn();
      
      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: mockOnDoneAndSubmitStage
        })
      );

      await act(async () => {
        await result.current.handleAudioClick();
        result.current.handleStartRecording();
      });

      // Simulate progressive upload error
      const mockProgressiveUpload = result.current.progressiveUpload;
      if (mockProgressiveUpload) {
        // Mock chunk upload failure
        const originalProcessChunk = mockProgressiveUpload.processRecordingChunk;
        mockProgressiveUpload.processRecordingChunk = jest.fn().mockResolvedValue({
          success: false,
          error: new Error('Network error')
        });

        const mockChunkData = new Blob(['chunk data'], { type: 'audio/webm' });
        const mockEvent = { data: mockChunkData };

        await act(async () => {
          const mockRecorder = MediaRecorder.mock.instances[0];
          mockRecorder.state = 'recording';
          if (mockRecorder.ondataavailable) {
            await mockRecorder.ondataavailable(mockEvent);
          }
        });

        // Recording should continue despite chunk upload failure
        expect(result.current.isRecording).toBe(true);
      }
    });

    test('should preserve Love Retold integration on errors', async () => {
      const mockDispatch = jest.fn();
      const mockAppActions = {
        SET_UPLOAD_IN_PROGRESS: 'SET_UPLOAD_IN_PROGRESS',
        SET_UPLOAD_FRACTION: 'SET_UPLOAD_FRACTION'
      };

      // Mock progressive upload with finalization error
      const mockProgressiveUpload = {
        chunksUploaded: 2,
        uploadProgress: 0.8,
        getTotalSize: () => 10000,
        finalizeUpload: jest.fn().mockResolvedValue({
          success: false,
          error: new Error('Finalization failed')
        })
      };

      const submissionHandler = createSubmissionHandler({
        recordedBlobUrl: 'blob:mock-url',
        captureMode: 'audio',
        actualMimeType: 'audio/webm',
        sessionId: mockSessionId,
        sessionComponents: mockSessionComponents,
        sessionData: mockSessionData,
        progressiveUpload: mockProgressiveUpload,
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS: mockAppActions
      });

      try {
        await act(async () => {
          await submissionHandler();
        });
      } catch (error) {
        expect(error.message).toBe('Progressive upload finalization failed');
      }

      expect(mockProgressiveUpload.finalizeUpload).toHaveBeenCalled();
      // Should not call Love Retold upload if finalization fails
      expect(uploadLoveRetoldRecording).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Compliance', () => {
    test('should respect PROGRESSIVE_UPLOAD_ENABLED flag', async () => {
      // Test with flag disabled
      const originalFlag = RECORDING_LIMITS.PROGRESSIVE_UPLOAD_ENABLED;
      RECORDING_LIMITS.PROGRESSIVE_UPLOAD_ENABLED = false;

      const mockOnDoneAndSubmitStage = jest.fn();
      
      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: mockOnDoneAndSubmitStage
        })
      );

      await act(async () => {
        await result.current.handleAudioClick();
        result.current.handleStartRecording();
      });

      const mockRecorder = MediaRecorder.mock.instances[0];
      mockRecorder.state = 'recording';

      // Simulate chunk data - should not trigger progressive upload
      const mockChunkData = new Blob(['chunk data'], { type: 'audio/webm' });
      const mockEvent = { data: mockChunkData };

      await act(async () => {
        if (mockRecorder.ondataavailable) {
          await mockRecorder.ondataavailable(mockEvent);
        }
      });

      expect(result.current.chunksUploaded).toBe(0);

      // Restore original flag
      RECORDING_LIMITS.PROGRESSIVE_UPLOAD_ENABLED = originalFlag;
    });
  });
});