/**
 * Submission Handlers Tests (C06 Integration)
 * 
 * Tests for the enhanced submission handlers with C06 recording service integration.
 */

import { createSubmissionHandler } from './submissionHandlers.js';

// Import mocked dependencies
import { uploadRecording as uploadRecordingLocal } from '../services/localRecordingService';
import {
  uploadMemoryRecording,
  uploadRecordingWithMetadata,
  isRecordingUploadEnabled
} from '../services/firebase';

// Mock dependencies
jest.mock('../services/localRecordingService', () => ({
  uploadRecording: jest.fn()
}));

jest.mock('../services/firebase', () => ({
  uploadMemoryRecording: jest.fn(),
  uploadRecording: jest.fn(),
  uploadRecordingWithMetadata: jest.fn(),
  isRecordingUploadEnabled: jest.fn()
}));

jest.mock('../config', () => ({
  ENV_CONFIG: {
    USE_FIREBASE: true,
    FIREBASE_STORAGE_ENABLED: true,
    RECORDING_UPLOAD_ENABLED: true
  }
}));

// Mock fetch for blob conversion
global.fetch = jest.fn();

describe('Submission Handlers (C06 Integration)', () => {
  const mockDispatch = jest.fn();
  const APP_ACTIONS = {
    SET_UPLOAD_IN_PROGRESS: 'SET_UPLOAD_IN_PROGRESS',
    SET_UPLOAD_FRACTION: 'SET_UPLOAD_FRACTION',
    SET_DOC_ID: 'SET_DOC_ID',
    SET_SHOW_CONFETTI: 'SET_SHOW_CONFETTI'
  };

  const mockBlob = new Blob(['test data'], { type: 'audio/mp4' });
  const recordedBlobUrl = 'blob:http://localhost/test-blob';

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    // Mock fetch response for blob conversion
    fetch.mockResolvedValue({
      blob: () => Promise.resolve(mockBlob)
    });
  });

  describe('Firebase Recording Upload (C06)', () => {
    it('should use C06 recording service when enabled', async () => {
      isRecordingUploadEnabled.mockReturnValue(true);
      uploadRecordingWithMetadata.mockResolvedValue({
        success: true,
        recordingId: 'test-recording-123',
        downloadUrl: 'https://firebase.storage/test-url',
        storagePath: 'test-storage-path'
      });

      const handleSubmit = createSubmissionHandler({
        recordedBlobUrl,
        captureMode: 'audio',
        actualMimeType: 'audio/mp4',
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS
      });

      await handleSubmit();

      expect(isRecordingUploadEnabled).toHaveBeenCalled();
      expect(uploadRecordingWithMetadata).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.objectContaining({
          fileType: 'audio',
          userId: 'anonymous'
        }),
        expect.objectContaining({
          onProgress: expect.any(Function),
          linkToFirestore: true
        })
      );

      // Verify dispatch calls
      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_ACTIONS.SET_UPLOAD_IN_PROGRESS,
        payload: true
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_ACTIONS.SET_DOC_ID,
        payload: 'test-recording-123'
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_ACTIONS.SET_SHOW_CONFETTI,
        payload: true
      });
    });

    it('should fallback to C05 when C06 is disabled', async () => {
      isRecordingUploadEnabled.mockReturnValue(false);
      uploadMemoryRecording.mockResolvedValue({
        downloadURL: 'https://firebase.storage/c05-url',
        storagePath: 'c05-storage-path'
      });

      const handleSubmit = createSubmissionHandler({
        recordedBlobUrl,
        captureMode: 'video',
        actualMimeType: 'video/mp4',
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS
      });

      await handleSubmit();

      expect(isRecordingUploadEnabled).toHaveBeenCalled();
      expect(uploadMemoryRecording).toHaveBeenCalledWith(
        expect.any(Blob),
        'anonymous',
        expect.any(String), // memoryId
        expect.objectContaining({
          mediaType: 'video',
          onProgress: expect.any(Function),
          linkToFirestore: true
        })
      );

      expect(uploadRecordingWithMetadata).not.toHaveBeenCalled();
    });

    it('should handle C06 upload failure gracefully', async () => {
      isRecordingUploadEnabled.mockReturnValue(true);
      uploadRecordingWithMetadata.mockResolvedValue({
        success: false,
        error: 'Upload failed due to network error'
      });

      const handleSubmit = createSubmissionHandler({
        recordedBlobUrl,
        captureMode: 'audio',
        actualMimeType: 'audio/mp4',
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS
      });

      // Mock alert
      global.alert = jest.fn();

      await handleSubmit();

      expect(global.alert).toHaveBeenCalledWith('Something went wrong during upload.');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_ACTIONS.SET_UPLOAD_IN_PROGRESS,
        payload: false
      });
    });

    it('should call progress callback during upload', async () => {
      isRecordingUploadEnabled.mockReturnValue(true);
      
      uploadRecordingWithMetadata.mockImplementation((blob, sessionInfo, options) => {
        // Simulate progress updates
        options.onProgress(0.25);
        options.onProgress(0.5);
        options.onProgress(1.0);
        
        return Promise.resolve({
          success: true,
          recordingId: 'test-id',
          downloadUrl: 'test-url',
          storagePath: 'test-path'
        });
      });

      const handleSubmit = createSubmissionHandler({
        recordedBlobUrl,
        captureMode: 'audio',
        actualMimeType: 'audio/mp4',
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS
      });

      await handleSubmit();

      // Verify progress dispatches
      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_ACTIONS.SET_UPLOAD_FRACTION,
        payload: 0.25
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_ACTIONS.SET_UPLOAD_FRACTION,
        payload: 0.5
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_ACTIONS.SET_UPLOAD_FRACTION,
        payload: 1.0
      });
    });
  });

  describe('Local Storage Fallback', () => {
    beforeEach(() => {
      // Override ENV_CONFIG to disable Firebase
      jest.doMock('../config', () => ({
        ENV_CONFIG: {
          USE_FIREBASE: false,
          FIREBASE_STORAGE_ENABLED: false
        }
      }));
    });

    it('should use local storage when Firebase is disabled', async () => {
      uploadRecordingLocal.mockResolvedValue({
        docId: 'local-123',
        downloadURL: 'blob:local-url'
      });

      const handleSubmit = createSubmissionHandler({
        recordedBlobUrl,
        captureMode: 'audio',
        actualMimeType: 'audio/mp4',
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS
      });

      await handleSubmit();

      expect(uploadRecordingLocal).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringMatching(/\d{4}-\d{2}-\d{2}_\d{6}_audio\.m4a/),
        'audio',
        expect.any(Function),
        'audio/mp4'
      );

      expect(uploadRecordingWithMetadata).not.toHaveBeenCalled();
      expect(uploadMemoryRecording).not.toHaveBeenCalled();
    });
  });

  describe('File name generation', () => {
    it('should generate correct file extension for video mp4', async () => {
      isRecordingUploadEnabled.mockReturnValue(true);
      uploadRecordingWithMetadata.mockResolvedValue({
        success: true,
        recordingId: 'test-id',
        downloadUrl: 'test-url',
        storagePath: 'test-path'
      });

      const handleSubmit = createSubmissionHandler({
        recordedBlobUrl,
        captureMode: 'video',
        actualMimeType: 'video/mp4;codecs=h264',
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS
      });

      await handleSubmit();

      expect(uploadRecordingWithMetadata).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.objectContaining({
          fileName: expect.stringMatching(/\d{4}-\d{2}-\d{2}_\d{6}_video/)
        }),
        expect.any(Object)
      );
    });

    it('should generate correct file extension for audio mp4', async () => {
      isRecordingUploadEnabled.mockReturnValue(true);
      uploadRecordingWithMetadata.mockResolvedValue({
        success: true,
        recordingId: 'test-id',
        downloadUrl: 'test-url',
        storagePath: 'test-path'
      });

      const handleSubmit = createSubmissionHandler({
        recordedBlobUrl,
        captureMode: 'audio',
        actualMimeType: 'audio/mp4;codecs=aac',
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS
      });

      await handleSubmit();

      expect(uploadRecordingWithMetadata).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.objectContaining({
          fileName: expect.stringMatching(/\d{4}-\d{2}-\d{2}_\d{6}_audio/)
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error handling', () => {
    it('should handle missing blob URL', async () => {
      const handleSubmit = createSubmissionHandler({
        recordedBlobUrl: null,
        captureMode: 'audio',
        actualMimeType: 'audio/mp4',
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS
      });

      await handleSubmit();

      expect(console.warn).toHaveBeenCalledWith('No recorded blob URL found.');
      expect(uploadRecordingWithMetadata).not.toHaveBeenCalled();
      expect(uploadRecordingLocal).not.toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Fetch failed'));
      global.alert = jest.fn();

      const handleSubmit = createSubmissionHandler({
        recordedBlobUrl,
        captureMode: 'audio',
        actualMimeType: 'audio/mp4',
        appState: {},
        dispatch: mockDispatch,
        APP_ACTIONS
      });

      await handleSubmit();

      expect(global.alert).toHaveBeenCalledWith('Something went wrong during upload.');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_ACTIONS.SET_UPLOAD_IN_PROGRESS,
        payload: false
      });
    });
  });
});

console.log('🧪 Submission Handlers Tests (C06): LOADED');