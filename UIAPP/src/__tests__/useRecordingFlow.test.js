/**
 * useRecordingFlow.test.js - C09 Integration Tests
 * ==============================================
 * 
 * Comprehensive tests for useRecordingFlow hook with Firebase integration.
 * Tests both localStorage mode and Firebase mode functionality.
 * 
 * Test Coverage:
 * - Firebase integration and session validation
 * - Authentication initialization
 * - Session parsing from URL parameters
 * - Recording permissions based on session state
 * - Error handling and fallback behavior
 * - Original recording functionality preservation
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import useRecordingFlow from '../hooks/useRecordingFlow';

// Mock Firebase services
jest.mock('../services/firebase', () => ({
  initializeAuth: jest.fn(),
  validateSession: jest.fn(),
  canRecord: jest.fn(),
  getEnhancedSessionStatus: jest.fn(),
  isErrorStatus: jest.fn()
}));

// Mock Firebase error handler
jest.mock('../utils/firebaseErrorHandler', () => ({
  firebaseErrorHandler: {
    withRetry: jest.fn((fn) => fn()),
    mapError: jest.fn((error) => ({ message: error.message, type: 'NETWORK_ERROR' })),
    log: jest.fn(),
    isEnabled: jest.fn(() => true)
  }
}));

// Mock environment configuration
jest.mock('../config', () => ({
  RECORDING_LIMITS: {
    MAX_DURATION_SECONDS: 30,
    TIMER_INTERVAL_MS: 1000
  },
  SUPPORTED_FORMATS: {
    audio: ['audio/webm'],
    video: ['video/webm']
  },
  ENV_CONFIG: {
    USE_FIREBASE: true // Default to Firebase mode for tests
  }
}));

// Mock useCountdown hook
jest.mock('../hooks/useCountdown', () => ({
  __esModule: true,
  default: () => ({
    countdownActive: false,
    countdownValue: 3,
    startCountdown: jest.fn()
  })
}));

// Mock MediaRecorder and getUserMedia
global.MediaRecorder = class {
  constructor(stream, options) {
    this.stream = stream;
    this.options = options;
    this.state = 'inactive';
    this.mimeType = options?.mimeType || 'video/webm';
    this.ondataavailable = null;
    this.onstop = null;
  }
  
  start() {
    this.state = 'recording';
    if (this.onstart) this.onstart();
  }
  
  stop() {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  }
  
  pause() {
    this.state = 'paused';
    if (this.onpause) this.onpause();
  }
  
  resume() {
    this.state = 'recording';
    if (this.onresume) this.onresume();
  }
};

global.MediaRecorder.isTypeSupported = jest.fn(() => true);

global.navigator.mediaDevices = {
  getUserMedia: jest.fn(() => Promise.resolve({
    getTracks: () => [{ stop: jest.fn() }]
  }))
};

// URL and location mocking
delete window.location;
window.location = {
  search: '',
  pathname: '/',
  href: 'http://localhost:3000'
};

describe('useRecordingFlow Hook - C09 Firebase Integration', () => {
  let mockServices;
  let mockFirebaseErrorHandler;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get mocked services
    mockServices = require('../services/firebase');
    mockFirebaseErrorHandler = require('../utils/firebaseErrorHandler').firebaseErrorHandler;
    
    // Default successful mocks
    mockServices.initializeAuth.mockResolvedValue();
    mockServices.validateSession.mockResolvedValue({
      status: 'active',
      message: 'Session is valid',
      isValid: true
    });
    mockServices.canRecord.mockReturnValue(true);
    mockServices.getEnhancedSessionStatus.mockReturnValue({
      message: 'Ready to record',
      canRecord: true,
      status: 'active'
    });
    mockServices.isErrorStatus.mockReturnValue(false);
    
    // Reset window location
    window.location.search = '';
    window.location.pathname = '/';
  });

  describe('Firebase Mode Integration', () => {
    test('should initialize Firebase authentication on mount', async () => {
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(mockServices.initializeAuth).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(result.current.authState).toBe('authenticated');
      });
    });

    test('should parse session ID from URL query parameters', async () => {
      window.location.search = '?sessionId=test-session-123';
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.sessionId).toBe('test-session-123');
      });
    });

    test('should parse session ID from URL path parameters', async () => {
      window.location.pathname = '/record/test-session-456';
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.sessionId).toBe('test-session-456');
      });
    });

    test('should validate session after authentication', async () => {
      window.location.search = '?sessionId=test-session-123';
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.authState).toBe('authenticated');
      });
      
      await waitFor(() => {
        expect(mockServices.validateSession).toHaveBeenCalledWith('test-session-123');
        expect(result.current.sessionValidationState).toBe('valid');
      });
    });

    test('should handle session validation errors', async () => {
      window.location.search = '?sessionId=invalid-session';
      
      mockServices.validateSession.mockResolvedValue({
        status: 'expired',
        message: 'Session has expired',
        isValid: false
      });
      mockServices.isErrorStatus.mockReturnValue(true);
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.sessionValidationState).toBe('error');
        expect(result.current.sessionError).toBe('Session has expired');
      });
    });

    test('should handle invalid session states', async () => {
      window.location.search = '?sessionId=completed-session';
      
      mockServices.validateSession.mockResolvedValue({
        status: 'completed',
        message: 'Recording already completed',
        isValid: true
      });
      mockServices.canRecord.mockReturnValue(false);
      mockServices.getEnhancedSessionStatus.mockReturnValue({
        message: 'Recording already completed',
        canRecord: false,
        status: 'completed'
      });
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.sessionValidationState).toBe('invalid');
        expect(result.current.recordingAllowed).toBe(false);
      });
    });
  });

  describe('Recording Permissions', () => {
    test('should allow recording when session is valid', async () => {
      window.location.search = '?sessionId=valid-session';
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.isSessionValidated).toBe(true);
        expect(result.current.recordingAllowed).toBe(true);
        expect(result.current.recordingBlockReason).toBeNull();
      });
    });

    test('should block recording when session is invalid', async () => {
      window.location.search = '?sessionId=expired-session';
      
      mockServices.validateSession.mockResolvedValue({
        status: 'expired',
        message: 'Session expired',
        isValid: false
      });
      mockServices.isErrorStatus.mockReturnValue(true);
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.recordingAllowed).toBe(false);
        expect(result.current.recordingBlockReason).toContain('Session expired');
      });
    });

    test('should block recording when no session ID is provided', async () => {
      // No session ID in URL
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.recordingAllowed).toBe(false);
        expect(result.current.recordingBlockReason).toContain('No recording session found');
      });
    });

    test('should block recording during authentication', async () => {
      mockServices.initializeAuth.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      const { result } = renderHook(() => useRecordingFlow());
      
      expect(result.current.recordingAllowed).toBe(false);
      expect(result.current.recordingBlockReason).toBe('Authenticating...');
    });

    test('should block recording during session validation', async () => {
      window.location.search = '?sessionId=validating-session';
      mockServices.validateSession.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.authState).toBe('authenticated');
      });
      
      expect(result.current.recordingAllowed).toBe(false);
      expect(result.current.recordingBlockReason).toContain('Validating recording session');
    });
  });

  describe('Media Permission Integration', () => {
    test('should check session validation before requesting video permissions', async () => {
      window.location.search = '?sessionId=valid-session';
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.recordingAllowed).toBe(true);
      });
      
      await act(async () => {
        await result.current.handleVideoClick();
      });
      
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: true
      });
    });

    test('should check session validation before requesting audio permissions', async () => {
      window.location.search = '?sessionId=valid-session';
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.recordingAllowed).toBe(true);
      });
      
      await act(async () => {
        await result.current.handleAudioClick();
      });
      
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true
      });
    });

    test('should prevent media access when session is invalid', async () => {
      window.location.search = '?sessionId=expired-session';
      
      mockServices.validateSession.mockResolvedValue({
        status: 'expired',
        message: 'Session expired',
        isValid: false
      });
      mockServices.isErrorStatus.mockReturnValue(true);
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.recordingAllowed).toBe(false);
      });
      
      await act(async () => {
        await result.current.handleVideoClick();
      });
      
      expect(global.navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication failures', async () => {
      const authError = new Error('Authentication failed');
      mockServices.initializeAuth.mockRejectedValue(authError);
      mockFirebaseErrorHandler.mapError.mockReturnValue({
        message: 'Authentication failed',
        type: 'AUTH_ERROR'
      });
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.authState).toBe('error');
        expect(result.current.authError).toMatchObject({
          message: 'Authentication failed'
        });
      });
    });

    test('should handle session validation failures', async () => {
      window.location.search = '?sessionId=failing-session';
      
      const validationError = new Error('Network error');
      mockServices.validateSession.mockRejectedValue(validationError);
      mockFirebaseErrorHandler.mapError.mockReturnValue({
        message: 'Network error occurred',
        type: 'NETWORK_ERROR'
      });
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.authState).toBe('authenticated');
      });
      
      await waitFor(() => {
        expect(result.current.sessionValidationState).toBe('error');
        expect(result.current.sessionError).toBe('Network error occurred');
      });
    });
  });

  describe('Loading States', () => {
    test('should provide loading state during initialization', () => {
      mockServices.initializeAuth.mockImplementation(() => new Promise(() => {}));
      
      const { result } = renderHook(() => useRecordingFlow());
      
      const loadingState = result.current.getLoadingState();
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.message).toBe('Initializing...');
    });

    test('should provide loading state during session validation', async () => {
      window.location.search = '?sessionId=loading-session';
      mockServices.validateSession.mockImplementation(() => new Promise(() => {}));
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.authState).toBe('authenticated');
      });
      
      const loadingState = result.current.getLoadingState();
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.message).toBe('Validating recording session...');
    });

    test('should not show loading state when ready', async () => {
      window.location.search = '?sessionId=ready-session';
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.sessionValidationState).toBe('valid');
      });
      
      const loadingState = result.current.getLoadingState();
      expect(loadingState.isLoading).toBe(false);
      expect(loadingState.message).toBeNull();
    });
  });

  describe('LocalStorage Mode (Firebase Disabled)', () => {
    beforeEach(() => {
      // Mock Firebase as disabled
      const mockConfig = require('../config');
      mockConfig.ENV_CONFIG.USE_FIREBASE = false;
    });

    test('should allow recording immediately when Firebase is disabled', () => {
      const { result } = renderHook(() => useRecordingFlow());
      
      expect(result.current.isFirebaseEnabled).toBe(false);
      expect(result.current.recordingAllowed).toBe(true);
      expect(result.current.isSessionValidated).toBe(true);
    });

    test('should not initialize Firebase services when disabled', () => {
      renderHook(() => useRecordingFlow());
      
      expect(mockServices.initializeAuth).not.toHaveBeenCalled();
      expect(mockServices.validateSession).not.toHaveBeenCalled();
    });

    test('should allow media access immediately when Firebase is disabled', async () => {
      const { result } = renderHook(() => useRecordingFlow());
      
      await act(async () => {
        await result.current.handleVideoClick();
      });
      
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });
  });

  describe('Integration with Original Functionality', () => {
    test('should preserve all original hook properties', async () => {
      window.location.search = '?sessionId=test-session';
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.isSessionValidated).toBe(true);
      });
      
      // Original properties should be present
      expect(result.current).toHaveProperty('captureMode');
      expect(result.current).toHaveProperty('countdownActive');
      expect(result.current).toHaveProperty('countdownValue');
      expect(result.current).toHaveProperty('isRecording');
      expect(result.current).toHaveProperty('isPaused');
      expect(result.current).toHaveProperty('elapsedSeconds');
      expect(result.current).toHaveProperty('recordedBlobUrl');
      expect(result.current).toHaveProperty('mediaStream');
      expect(result.current).toHaveProperty('actualMimeType');
      
      // Original handlers should be present
      expect(typeof result.current.handleVideoClick).toBe('function');
      expect(typeof result.current.handleAudioClick).toBe('function');
      expect(typeof result.current.handleStartRecording).toBe('function');
      expect(typeof result.current.handlePause).toBe('function');
      expect(typeof result.current.handleResume).toBe('function');
      expect(typeof result.current.handleDone).toBe('function');
      expect(typeof result.current.setCaptureMode).toBe('function');
    });

    test('should preserve original recording lifecycle', async () => {
      window.location.search = '?sessionId=test-session';
      
      const { result } = renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(result.current.recordingAllowed).toBe(true);
      });
      
      // Set up media stream
      await act(async () => {
        await result.current.handleVideoClick();
      });
      
      expect(result.current.captureMode).toBe('video');
      expect(result.current.mediaStream).toBeTruthy();
    });
  });

  describe('Retry and Error Recovery', () => {
    test('should retry authentication on failure', async () => {
      mockServices.initializeAuth
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue();
      
      renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(mockFirebaseErrorHandler.withRetry).toHaveBeenCalledWith(
          expect.any(Function),
          { maxRetries: 3 },
          'auth-initialization'
        );
      });
    });

    test('should retry session validation on failure', async () => {
      window.location.search = '?sessionId=retry-session';
      
      mockServices.validateSession
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue({
          status: 'active',
          message: 'Session valid',
          isValid: true
        });
      
      renderHook(() => useRecordingFlow());
      
      await waitFor(() => {
        expect(mockFirebaseErrorHandler.withRetry).toHaveBeenCalledWith(
          expect.any(Function),
          { maxRetries: 2 },
          'session-validation'
        );
      });
    });
  });
});