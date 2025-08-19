/**
 * useRecordingFlow.js
 * -------------------
 * Custom React hook that manages the entire audio/video recording cycle
 * Enhanced with Firebase integration (C09):
 *   - Session validation and authentication
 *   - Firebase-aware recording permissions
 *   - Getting media permissions
 *   - Handling pause, resume
 *   - 30-second timer (capped, but no auto-stop)
 *   - Generating a Blob URL of the final recording
 *
 * Helps keep App.jsx lean by encapsulating recording logic.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { RECORDING_LIMITS, SUPPORTED_FORMATS, ENV_CONFIG } from '../config';
import useCountdown from './useCountdown';
import { createError, UPLOAD_ERRORS } from '../utils/errors';

// C09: Firebase services integration
import {
  initializeAuth,
  validateSession,
  canRecord as canRecordFromStatus,
  getEnhancedSessionStatus,
  isErrorStatus
} from '../services/firebase';
import { firebaseErrorHandler } from '../utils/firebaseErrorHandler';

export default function useRecordingFlow() {
  // ===========================
  // State & References
  // ===========================
  const [captureMode, setCaptureMode] = useState(null); // 'audio' or 'video'
  const [mediaStream, setMediaStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState(null);
  const recordedChunksRef = useRef([]);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Countdown functionality using reusable hook
  const { countdownActive, countdownValue, startCountdown } = useCountdown();

  // Elapsed time (up to 30s)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Track the actual MIME type chosen by MediaRecorder
  const [actualMimeType, setActualMimeType] = useState(null);

  // ===========================
  // C09: Firebase Integration State
  // ===========================
  
  // Session management
  const [sessionId, setSessionId] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [sessionValidationState, setSessionValidationState] = useState('idle'); // 'idle' | 'validating' | 'valid' | 'invalid' | 'error'
  const [sessionError, setSessionError] = useState(null);
  
  // Firebase authentication state
  const [authState, setAuthState] = useState('idle'); // 'idle' | 'initializing' | 'authenticated' | 'error'
  const [authError, setAuthError] = useState(null);
  
  // Feature flag check
  const isFirebaseEnabled = ENV_CONFIG.USE_FIREBASE;

  // ===========================
  // Effects
  // ===========================
  // Recording timer: caps at max duration, no auto-stop
  useEffect(() => {
    let intervalId;
    if (isRecording && !isPaused) {
      intervalId = setInterval(() => {
        setElapsedSeconds((prev) => {
          // If we've hit max duration, just cap it.
          // We no longer call handleDone() here.
          if (prev >= RECORDING_LIMITS.MAX_DURATION_SECONDS) {
            return RECORDING_LIMITS.MAX_DURATION_SECONDS;
          }
          return prev + 1;
        });
      }, RECORDING_LIMITS.TIMER_INTERVAL_MS);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRecording, isPaused]);

  // ===========================
  // C09: Firebase Integration Effects  
  // ===========================

  // Parse session ID from URL parameters
  useEffect(() => {
    if (!isFirebaseEnabled) return;

    const parseSessionFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const urlSessionId = params.get('sessionId') || 
                          params.get('session_id') || 
                          params.get('session');
      
      // Also check path parameters (MVPAPP style: /record/:sessionId)
      const pathParts = window.location.pathname.split('/');
      const pathSessionId = pathParts[pathParts.length - 1];
      
      return urlSessionId || (pathParts.length > 1 ? pathSessionId : null);
    };

    const parsedSessionId = parseSessionFromUrl();
    if (parsedSessionId && parsedSessionId !== sessionId) {
      firebaseErrorHandler.log('info', 'Session ID parsed from URL', { 
        sessionId: parsedSessionId 
      }, {
        service: 'recording-flow',
        operation: 'session-parsing'
      });
      setSessionId(parsedSessionId);
    }
  }, [isFirebaseEnabled, sessionId]);

  // Initialize Firebase authentication
  useEffect(() => {
    if (!isFirebaseEnabled || authState !== 'idle') return;

    const initializeFirebaseAuth = async () => {
      setAuthState('initializing');
      setAuthError(null);

      try {
        await firebaseErrorHandler.withRetry(
          () => initializeAuth(),
          { maxRetries: 3 },
          'auth-initialization'
        );
        
        setAuthState('authenticated');
        firebaseErrorHandler.log('info', 'Firebase authentication initialized successfully', null, {
          service: 'recording-flow',
          operation: 'auth-init'
        });
      } catch (error) {
        const mappedError = firebaseErrorHandler.mapError(error, 'auth-initialization');
        setAuthError(mappedError);
        setAuthState('error');
        
        firebaseErrorHandler.log('error', 'Firebase authentication initialization failed', mappedError, {
          service: 'recording-flow',
          operation: 'auth-init-error'
        });
      }
    };

    initializeFirebaseAuth();
  }, [isFirebaseEnabled, authState]);

  // Validate session with Firebase Functions
  useEffect(() => {
    if (!isFirebaseEnabled || 
        !sessionId || 
        authState !== 'authenticated' || 
        sessionValidationState !== 'idle') {
      return;
    }

    const validateRecordingSession = async () => {
      setSessionValidationState('validating');
      setSessionError(null);

      try {
        const validationResult = await firebaseErrorHandler.withRetry(
          () => validateSession(sessionId),
          { maxRetries: 2 },
          'session-validation'
        );

        setSessionData(validationResult);

        if (isErrorStatus(validationResult.status)) {
          setSessionValidationState('error');
          setSessionError(validationResult.message);
          firebaseErrorHandler.log('warn', 'Session validation returned error status', {
            sessionId,
            status: validationResult.status,
            message: validationResult.message
          }, {
            service: 'recording-flow',
            operation: 'session-validation'
          });
        } else if (canRecordFromStatus(validationResult.status)) {
          setSessionValidationState('valid');
          firebaseErrorHandler.log('info', 'Session validation successful - recording allowed', {
            sessionId,
            status: validationResult.status
          }, {
            service: 'recording-flow',
            operation: 'session-validation'
          });
        } else {
          setSessionValidationState('invalid');
          const statusInfo = getEnhancedSessionStatus(validationResult.status, validationResult.message);
          setSessionError(statusInfo.message);
          firebaseErrorHandler.log('info', 'Session validation successful - recording not allowed', {
            sessionId,
            status: validationResult.status,
            reason: statusInfo.message
          }, {
            service: 'recording-flow',
            operation: 'session-validation'
          });
        }
      } catch (error) {
        const mappedError = firebaseErrorHandler.mapError(error, 'session-validation');
        setSessionValidationState('error');
        setSessionError(mappedError.message);
        
        firebaseErrorHandler.log('error', 'Session validation failed', mappedError, {
          service: 'recording-flow',
          operation: 'session-validation'
        });
      }
    };

    validateRecordingSession();
  }, [isFirebaseEnabled, sessionId, authState, sessionValidationState]);

  // ===========================
  // C09: Helper Functions
  // ===========================

  // Check if recording is allowed based on Firebase state
  const canStartRecording = useCallback(() => {
    // If Firebase is disabled, allow recording (localStorage mode)
    if (!isFirebaseEnabled) {
      return { allowed: true, reason: null };
    }

    // Check authentication state
    if (authState === 'error') {
      return { allowed: false, reason: authError?.message || 'Authentication failed' };
    }
    if (authState !== 'authenticated') {
      return { allowed: false, reason: 'Authenticating...' };
    }

    // Check session validation state
    if (!sessionId) {
      return { allowed: false, reason: 'No recording session found. Please use a valid recording link.' };
    }
    
    if (sessionValidationState === 'validating') {
      return { allowed: false, reason: 'Validating recording session...' };
    }
    
    if (sessionValidationState === 'error') {
      return { allowed: false, reason: sessionError || 'Session validation failed' };
    }
    
    if (sessionValidationState === 'invalid') {
      return { allowed: false, reason: sessionError || 'This recording session is not available for recording' };
    }
    
    if (sessionValidationState !== 'valid') {
      return { allowed: false, reason: 'Recording session not ready' };
    }

    return { allowed: true, reason: null };
  }, [isFirebaseEnabled, authState, authError, sessionId, sessionValidationState, sessionError]);

  // Get loading state information
  const getLoadingState = useCallback(() => {
    if (!isFirebaseEnabled) {
      return { isLoading: false, message: null };
    }

    if (authState === 'initializing') {
      return { isLoading: true, message: 'Initializing...' };
    }

    if (sessionValidationState === 'validating') {
      return { isLoading: true, message: 'Validating recording session...' };
    }

    return { isLoading: false, message: null };
  }, [isFirebaseEnabled, authState, sessionValidationState]);

  // ===========================
  // Permission & Capture Setup
  // ===========================
  async function handleVideoClick() {
    // C09: Check Firebase session validation first
    const recordingCheck = canStartRecording();
    if (!recordingCheck.allowed) {
      const structuredError = createError(
        UPLOAD_ERRORS.PERMISSION_DENIED,
        recordingCheck.reason,
        null
      );
      console.warn('Recording not allowed (video mode):', structuredError);
      // Could trigger UI notification here
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setMediaStream(stream);
      setCaptureMode('video');
    } catch (err) {
      const structuredError = createError(
        UPLOAD_ERRORS.PERMISSION_DENIED,
        'Failed to access camera and microphone for video recording',
        err
      );
      console.error('Media access error (video mode):', structuredError);
    }
  }

  async function handleAudioClick() {
    // C09: Check Firebase session validation first
    const recordingCheck = canStartRecording();
    if (!recordingCheck.allowed) {
      const structuredError = createError(
        UPLOAD_ERRORS.PERMISSION_DENIED,
        recordingCheck.reason,
        null
      );
      console.warn('Recording not allowed (audio mode):', structuredError);
      // Could trigger UI notification here
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setMediaStream(stream);
      setCaptureMode('audio');
    } catch (err) {
      const structuredError = createError(
        UPLOAD_ERRORS.PERMISSION_DENIED,
        'Failed to access microphone for audio recording',
        err
      );
      console.error('Media access error (audio mode):', structuredError);
    }
  }

  // ===========================
  // Recording Lifecycle
  // ===========================
  function beginRecording() {
    if (!mediaStream) {
      console.warn('No media stream available to record.');
      return;
    }
    recordedChunksRef.current = [];

    let options = {};
    // Decide on best possible format based on captureMode using config constants
    if (window.MediaRecorder && typeof MediaRecorder.isTypeSupported === 'function') {
      const formats = SUPPORTED_FORMATS[captureMode];
      const supportedType = formats?.find(type => MediaRecorder.isTypeSupported(type));
      if (supportedType) {
        options = { mimeType: supportedType };
      } else if (captureMode === 'audio') {
        console.warn('No supported audio MIME type found, using default');
      }
    }

    let recorder;
    try {
      recorder = new MediaRecorder(mediaStream, options);
    } catch (err) {
      const structuredError = createError(
        UPLOAD_ERRORS.INVALID_FILE,
        'Failed to create MediaRecorder with the selected format',
        err
      );
      console.error('MediaRecorder creation error:', structuredError);
      return;
    }

    // Store the actual MIME type used
    setActualMimeType(recorder.mimeType);

    recorder.onstart = () => console.log('Recorder started');
    recorder.onpause = () => console.log('Recorder paused');
    recorder.onresume = () => console.log('Recorder resumed');
    recorder.onstop = () => {
      console.log('Recorder stopped');
      const completeBlob = new Blob(recordedChunksRef.current, {
        type: recorder.mimeType,
      });
      const url = URL.createObjectURL(completeBlob);
      setRecordedBlobUrl(url);
    };

    recorder.ondataavailable = (evt) => {
      if (evt.data && evt.data.size > 0) {
        recordedChunksRef.current.push(evt.data);
      }
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
    setIsPaused(false);
  }

  // Start with countdown using reusable hook
  function handleStartRecording() {
    startCountdown(() => {
      setElapsedSeconds(0);
      beginRecording();
    });
  }

  function handlePause() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setIsRecording(false);
      setIsPaused(true);
    }
  }

  function handleResume() {
    setIsPaused(false);
    startCountdown(() => {
      if (mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        setIsRecording(true);
      }
    });
  }

  function handleDone() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
    setMediaStream(null);
    setMediaRecorder(null);
    setIsRecording(false);
    setIsPaused(false);
  }

  // ===========================
  // Return everything needed by UI
  // ===========================
  return {
    // Original recording state
    captureMode,
    countdownActive,
    countdownValue,
    isRecording,
    isPaused,
    elapsedSeconds,
    recordedBlobUrl,
    mediaStream,
    // Expose actualMimeType so parent can set file extension accordingly
    actualMimeType,

    // Original handlers
    handleVideoClick,
    handleAudioClick,
    handleStartRecording,
    handlePause,
    handleResume,
    handleDone,
    setCaptureMode,

    // C09: Firebase integration state
    sessionId,
    sessionData,
    sessionValidationState,
    sessionError,
    authState,
    authError,
    isFirebaseEnabled,

    // C09: Helper functions
    canStartRecording,
    getLoadingState,

    // C09: Additional computed state for UI
    isSessionValidated: sessionValidationState === 'valid' || !isFirebaseEnabled,
    isInitializing: authState === 'initializing' || sessionValidationState === 'validating',
    hasSessionError: sessionValidationState === 'error' || authState === 'error',
    recordingAllowed: canStartRecording().allowed,
    recordingBlockReason: canStartRecording().reason,
  };
}
