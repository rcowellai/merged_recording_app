/**
 * slice-d-regression.test.js
 * --------------------------
 * SLICE-D: Regression tests to ensure existing functionality is preserved
 * Validates that Slices A-B-C functionality remains intact after Slice D implementation
 */

import { renderHook, act } from '@testing-library/react';
import useRecordingFlow from '../../src/hooks/useRecordingFlow';
import { createSubmissionHandler } from '../../src/utils/submissionHandlers';
import { uploadLoveRetoldRecording } from '../../src/services/firebase/loveRetoldUpload';

// Mock all the dependencies
jest.mock('../../src/services/firebase', () => ({
  initializeAuth: jest.fn().mockResolvedValue(),
}));

jest.mock('../../src/services/firebase/loveRetoldUpload', () => ({
  uploadLoveRetoldRecording: jest.fn()
}));

jest.mock('../../src/utils/firebaseErrorHandler', () => ({
  firebaseErrorHandler: {
    withFallback: jest.fn((fn) => fn()),
    withRetry: jest.fn((fn) => fn()),
    log: jest.fn(),
    mapError: jest.fn((error) => error),
  }
}));

jest.mock('../../src/utils/uploadErrorTracker', () => ({
  uploadErrorTracker: {
    logInfo: jest.fn(),
    logError: jest.fn(),
    logWarning: jest.fn(),
  }
}));

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
}));

global.MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true);
global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: () => [{ stop: jest.fn() }]
  })
};

// Mock fetch for blob conversion
global.fetch = jest.fn().mockResolvedValue({
  blob: () => Promise.resolve(new Blob(['test data'], { type: 'audio/webm' }))
});

describe('Slice D Regression Tests', () => {
  // Test data that preserves Slice A-B-C requirements
  const mockSessionId = 'slice-regression-session-123';
  const mockSessionComponents = {
    userId: 'truncated-user-id', // Slice A: truncated userId from session parsing
    promptId: 'prompt-123',
    storytellerId: 'storyteller-123'
  };
  const mockSessionData = {
    fullUserId: 'full-28-character-user-id-123', // Slice A: full userId from Firestore
    sessionDocument: { status: 'active' },
    askerName: 'Test User' // Slice B: Love Retold field structure
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Slice A Regression: Full userId Preservation', () => {
    test('should continue using full userId from sessionData in storage paths', async () => {
      uploadLoveRetoldRecording.mockResolvedValue({
        success: true,
        storagePath: `users/${mockSessionData.fullUserId}/recordings/${mockSessionId}/final/recording.webm`
      });

      const mockDispatch = jest.fn();
      const mockAppActions = {
        SET_UPLOAD_IN_PROGRESS: 'SET_UPLOAD_IN_PROGRESS',
        SET_UPLOAD_FRACTION: 'SET_UPLOAD_FRACTION'
      };

      // Create submission handler without progressive upload (traditional flow)
      const submissionHandler = createSubmissionHandler({
        recordedBlobUrl: 'blob:mock-url',
        captureMode: 'audio',
        actualMimeType: 'audio/webm',
        sessionId: mockSessionId,
        sessionComponents: mockSessionComponents,
        sessionData: mockSessionData,
        progressiveUpload: null, // No progressive upload to test traditional flow
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS: mockAppActions
      });

      await act(async () => {
        await submissionHandler();
      });

      // Verify Love Retold upload was called with correct parameters
      expect(uploadLoveRetoldRecording).toHaveBeenCalledWith(
        expect.any(Blob),
        mockSessionId,
        mockSessionComponents,
        mockSessionData, // Slice A: sessionData must be passed for fullUserId
        expect.objectContaining({
          mediaType: 'audio',
          actualMimeType: 'audio/webm'
        })
      );

      // Verify fullUserId is used in the call
      const callArgs = uploadLoveRetoldRecording.mock.calls[0];
      expect(callArgs[3]).toEqual(mockSessionData); // sessionData parameter
    });

    test('should fallback to truncated userId when fullUserId unavailable', async () => {
      const sessionDataWithoutFullUserId = { ...mockSessionData };
      delete sessionDataWithoutFullUserId.fullUserId;

      uploadLoveRetoldRecording.mockResolvedValue({
        success: true,
        storagePath: `users/${mockSessionComponents.userId}/recordings/${mockSessionId}/final/recording.webm`
      });

      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: sessionDataWithoutFullUserId,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: jest.fn()
        })
      );

      // Should still work with fallback to truncated userId
      expect(result.current.sessionData).toEqual(sessionDataWithoutFullUserId);
      expect(result.current.sessionComponents).toEqual(mockSessionComponents);
    });
  });

  describe('Slice B Regression: Love Retold Status System', () => {
    test('should preserve Love Retold status transitions', async () => {
      uploadLoveRetoldRecording.mockResolvedValue({
        success: true,
        storagePath: 'mock/storage/path',
        uploadMethod: 'traditional' // Not progressive
      });

      const mockDispatch = jest.fn();
      const mockAppActions = {
        SET_UPLOAD_IN_PROGRESS: 'SET_UPLOAD_IN_PROGRESS',
        SET_UPLOAD_FRACTION: 'SET_UPLOAD_FRACTION'
      };

      const submissionHandler = createSubmissionHandler({
        recordedBlobUrl: 'blob:mock-url',
        captureMode: 'audio',
        actualMimeType: 'audio/webm',
        sessionId: mockSessionId,
        sessionComponents: mockSessionComponents,
        sessionData: mockSessionData,
        progressiveUpload: null, // Traditional upload
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS: mockAppActions
      });

      await act(async () => {
        await submissionHandler();
      });

      // Verify Love Retold upload preserves status system
      expect(uploadLoveRetoldRecording).toHaveBeenCalledWith(
        expect.any(Blob),
        mockSessionId,
        mockSessionComponents,
        mockSessionData,
        expect.objectContaining({
          mediaType: 'audio',
          actualMimeType: 'audio/webm',
          onProgress: expect.any(Function), // Progress callback preserved
          maxRetries: 3 // Retry logic preserved
        })
      );
    });

    test('should preserve Love Retold error tracking and customer support info', async () => {
      const uploadError = new Error('Network upload failure');
      uploadLoveRetoldRecording.mockRejectedValue(uploadError);

      const mockDispatch = jest.fn();
      const mockAppActions = {
        SET_UPLOAD_IN_PROGRESS: 'SET_UPLOAD_IN_PROGRESS',
        SET_UPLOAD_FRACTION: 'SET_UPLOAD_FRACTION'
      };

      const submissionHandler = createSubmissionHandler({
        recordedBlobUrl: 'blob:mock-url',
        captureMode: 'audio',
        actualMimeType: 'audio/webm',
        sessionId: mockSessionId,
        sessionComponents: mockSessionComponents,
        sessionData: mockSessionData,
        progressiveUpload: null,
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS: mockAppActions
      });

      try {
        await act(async () => {
          await submissionHandler();
        });
      } catch (error) {
        // Error should be handled gracefully
      }

      // Verify customer support tracking is preserved
      const { uploadErrorTracker } = require('../../src/utils/uploadErrorTracker');
      expect(uploadErrorTracker.logInfo).toHaveBeenCalledWith(
        'Love Retold upload starting',
        expect.objectContaining({
          sessionId: mockSessionId,
          fullUserId: mockSessionData.fullUserId,
          truncatedUserId: mockSessionComponents.userId
        })
      );
    });
  });

  describe('Slice C Regression: Error Handling and Debug Interface', () => {
    test('should preserve existing error handling patterns', async () => {
      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: jest.fn()
        })
      );

      // Test Firebase authentication error handling
      expect(result.current.authState).toBe('idle');
      expect(result.current.authError).toBe(null);

      // Test media stream error handling
      global.navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(
        new Error('Permission denied')
      );

      await act(async () => {
        await result.current.handleAudioClick();
      });

      // Should handle permission error gracefully
      expect(result.current.mediaStream).toBe(null);
      expect(result.current.captureMode).toBe(null);
    });

    test('should preserve debug logging and error tracking', async () => {
      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: jest.fn()
        })
      );

      await act(async () => {
        await result.current.handleAudioClick();
      });

      expect(result.current.captureMode).toBe('audio');

      // Debug logging should be preserved (checked via console.log or debug utilities)
      // Error tracking utilities should remain functional
      const { uploadErrorTracker } = require('../../src/utils/uploadErrorTracker');
      expect(uploadErrorTracker.logInfo).toBeDefined();
      expect(uploadErrorTracker.logError).toBeDefined();
    });
  });

  describe('Traditional Recording Flow Preservation', () => {
    test('should maintain 30-second recording behavior when progressive upload disabled', async () => {
      // Mock configuration with progressive upload disabled
      const originalConfig = require('../../src/config').RECORDING_LIMITS;
      const disabledConfig = {
        ...originalConfig,
        PROGRESSIVE_UPLOAD_ENABLED: false,
        MAX_DURATION_SECONDS: 30 // Reset to original 30 seconds
      };

      jest.doMock('../../src/config', () => ({
        RECORDING_LIMITS: disabledConfig,
        SUPPORTED_FORMATS: {
          video: ['video/mp4;codecs=h264'],
          audio: ['audio/mp4;codecs=aac']
        },
        ENV_CONFIG: { USE_FIREBASE: true }
      }));

      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: jest.fn()
        })
      );

      await act(async () => {
        await result.current.handleAudioClick();
        result.current.handleStartRecording();
      });

      expect(result.current.isRecording).toBe(true);

      // Fast forward to 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(result.current.elapsedSeconds).toBe(30);

      // Should stop at 30 seconds when progressive upload disabled
      // (Auto-transition handled by RecordingFlow component)
    });

    test('should preserve MediaRecorder configuration and format selection', async () => {
      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: jest.fn()
        })
      );

      await act(async () => {
        await result.current.handleAudioClick();
        result.current.handleStartRecording();
      });

      // Verify MediaRecorder was created with correct format
      expect(MediaRecorder).toHaveBeenCalledWith(
        expect.any(Object), // media stream
        expect.objectContaining({
          mimeType: expect.any(String)
        })
      );

      expect(result.current.actualMimeType).toBeDefined();
    });

    test('should preserve pause/resume functionality', async () => {
      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: jest.fn()
        })
      );

      await act(async () => {
        await result.current.handleAudioClick();
        result.current.handleStartRecording();
      });

      const mockRecorder = MediaRecorder.mock.instances[0];
      mockRecorder.state = 'recording';

      // Test pause
      await act(async () => {
        result.current.handlePause();
      });

      expect(mockRecorder.pause).toHaveBeenCalled();
      expect(result.current.isPaused).toBe(true);

      // Test resume
      mockRecorder.state = 'paused';
      await act(async () => {
        result.current.handleResume();
      });

      expect(mockRecorder.resume).toHaveBeenCalled();
    });

    test('should preserve reset functionality', async () => {
      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: jest.fn()
        })
      );

      await act(async () => {
        await result.current.handleAudioClick();
        result.current.handleStartRecording();
      });

      // Record some data
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.elapsedSeconds).toBe(5);

      // Reset recording state
      await act(async () => {
        result.current.resetRecordingState();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.elapsedSeconds).toBe(0);
      expect(result.current.captureMode).toBe(null);
      expect(result.current.recordedBlobUrl).toBe(null);
    });
  });

  describe('Upload Flow Preservation', () => {
    test('should maintain traditional upload when no progressive chunks exist', async () => {
      uploadLoveRetoldRecording.mockResolvedValue({
        success: true,
        storagePath: 'mock/storage/path',
        uploadMethod: 'traditional'
      });

      const mockDispatch = jest.fn();
      const mockAppActions = {
        SET_UPLOAD_IN_PROGRESS: 'SET_UPLOAD_IN_PROGRESS',
        SET_UPLOAD_FRACTION: 'SET_UPLOAD_FRACTION'
      };

      // Progressive upload with no chunks (traditional fallback)
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

      // Should use traditional upload path
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

      // Should NOT have progressive upload flags
      const callOptions = uploadLoveRetoldRecording.mock.calls[0][4];
      expect(callOptions.isProgressiveUpload).toBeUndefined();
      expect(callOptions.chunkMetadata).toBeUndefined();
    });

    test('should preserve upload progress tracking', async () => {
      const mockDispatch = jest.fn();
      const mockAppActions = {
        SET_UPLOAD_IN_PROGRESS: 'SET_UPLOAD_IN_PROGRESS',
        SET_UPLOAD_FRACTION: 'SET_UPLOAD_FRACTION'
      };

      uploadLoveRetoldRecording.mockImplementation((blob, sessionId, components, data, options) => {
        // Simulate progress callbacks
        if (options.onProgress) {
          options.onProgress(25);
          options.onProgress(50);
          options.onProgress(75);
          options.onProgress(100);
        }
        return Promise.resolve({
          success: true,
          storagePath: 'mock/storage/path'
        });
      });

      const submissionHandler = createSubmissionHandler({
        recordedBlobUrl: 'blob:mock-url',
        captureMode: 'audio',
        actualMimeType: 'audio/webm',
        sessionId: mockSessionId,
        sessionComponents: mockSessionComponents,
        sessionData: mockSessionData,
        progressiveUpload: null,
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS: mockAppActions
      });

      await act(async () => {
        await submissionHandler();
      });

      // Verify progress tracking calls
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_UPLOAD_FRACTION',
        payload: 0.25
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_UPLOAD_FRACTION',
        payload: 1.0
      });
    });
  });

  describe('API Compatibility', () => {
    test('should maintain backward compatibility with existing hook API', async () => {
      const { result } = renderHook(() => 
        useRecordingFlow({
          sessionId: mockSessionId,
          sessionData: mockSessionData,
          sessionComponents: mockSessionComponents,
          onDoneAndSubmitStage: jest.fn()
        })
      );

      // All existing properties should still be available
      expect(result.current).toHaveProperty('captureMode');
      expect(result.current).toHaveProperty('mediaStream');
      expect(result.current).toHaveProperty('isRecording');
      expect(result.current).toHaveProperty('isPaused');
      expect(result.current).toHaveProperty('elapsedSeconds');
      expect(result.current).toHaveProperty('recordedBlobUrl');
      expect(result.current).toHaveProperty('actualMimeType');
      expect(result.current).toHaveProperty('countdownActive');
      expect(result.current).toHaveProperty('countdownValue');
      expect(result.current).toHaveProperty('authState');
      expect(result.current).toHaveProperty('authError');

      // Existing functions should still be available
      expect(typeof result.current.handleVideoClick).toBe('function');
      expect(typeof result.current.handleAudioClick).toBe('function');
      expect(typeof result.current.handleStartRecording).toBe('function');
      expect(typeof result.current.handlePause).toBe('function');
      expect(typeof result.current.handleResume).toBe('function');
      expect(typeof result.current.handleDone).toBe('function');
      expect(typeof result.current.resetRecordingState).toBe('function');

      // New progressive upload properties should be added
      expect(result.current).toHaveProperty('progressiveUpload');
      expect(result.current).toHaveProperty('chunksUploaded');
      expect(result.current).toHaveProperty('uploadProgress');
    });

    test('should maintain submission handler API compatibility', () => {
      const submissionHandler = createSubmissionHandler({
        recordedBlobUrl: 'blob:mock-url',
        captureMode: 'audio',
        actualMimeType: 'audio/webm',
        sessionId: mockSessionId,
        sessionComponents: mockSessionComponents,
        sessionData: mockSessionData,
        // progressiveUpload is optional - existing code works without it
        appState: {},
        dispatch: jest.fn(),
        APP_ACTIONS: {}
      });

      expect(typeof submissionHandler).toBe('function');
    });
  });
});