/**
 * useRecordingFlow.js
 * -------------------
 * Custom React hook that manages the entire audio/video recording cycle
 * Simplified for React Router architecture - session validation handled by SessionValidator
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { SUPPORTED_FORMATS, ENV_CONFIG } from '../config';
import useCountdown from './useCountdown';

// Firebase services integration (optional)
import { initializeAuth } from '../services/firebase';
import { firebaseErrorHandler } from '../utils/firebaseErrorHandler';
import { updateRecordingSession } from '../services/firebase/firestore';

// Progressive upload removed - using simple full upload after recording

export default function useRecordingFlow({ sessionId, sessionData, sessionComponents, onDoneAndSubmitStage }) {
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

  // NOTE: Elapsed time moved to TimerContext to prevent re-renders
  // Timer value accessed via useTimer() hook in components that need it

  // Track the actual MIME type chosen by MediaRecorder
  const [actualMimeType, setActualMimeType] = useState(null);

  // Firebase authentication state (optional)
  const [authState, setAuthState] = useState('idle');
  const [authError, setAuthError] = useState(null);
  
  // Feature flag check
  const isFirebaseEnabled = ENV_CONFIG.USE_FIREBASE;
  
  // Simplified recording - no progressive upload

  // ===========================
  // Effects
  // ===========================
  // NOTE: Recording timer moved to TimerContext (see TimerProvider in AppContent)

  // Initialize Firebase authentication (optional)
  useEffect(() => {
    if (!isFirebaseEnabled || authState !== 'idle') return;

    const initializeFirebaseAuth = async () => {
      setAuthState('initializing');
      setAuthError(null);

      try {
        await initializeAuth();
        setAuthState('authenticated');
        firebaseErrorHandler.log('info', 'Firebase authentication initialized', null, {
          service: 'recording-flow',
          operation: 'auth-init'
        });
      } catch (error) {
        const mappedError = firebaseErrorHandler.mapError(error, 'auth-initialization');
        setAuthError(mappedError);
        setAuthState('error');
        firebaseErrorHandler.log('error', 'Firebase authentication failed', mappedError, {
          service: 'recording-flow', 
          operation: 'auth-init-error'
        });
      }
    };

    initializeFirebaseAuth();
  }, [isFirebaseEnabled, authState]);

  // ===========================
  // Media Stream Management
  // ===========================
  const stopMediaStream = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
  }, [mediaStream]);

  // Clean up media on unmount only
  // Keep ref to latest mediaStream for cleanup without triggering effect on changes
  const mediaStreamRef = useRef(mediaStream);
  useEffect(() => {
    mediaStreamRef.current = mediaStream;
  }, [mediaStream]);

  useEffect(() => {
    return () => {
      // Use ref to get latest stream value at cleanup time
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Empty deps - only cleanup on unmount

  // Clean up mediaStream when captureMode is cleared
  // This ensures proper state cleanup when navigating back from test screens
  // Fixes bug: AudioTest/VideoTest → ChooseModeScreen navigation causing blank screen
  useEffect(() => {
    if (captureMode === null && mediaStream) {
      stopMediaStream();
    }
  }, [captureMode, mediaStream, stopMediaStream]);

  // ===========================
  // Recording Handlers
  // ===========================
  const handleVideoClick = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setCaptureMode('video');
      setMediaStream(stream);
    } catch (error) {
      // RE-THROW error so AppContent can handle it and show drawer
      throw error;
    }
  }, []);

  const handleAudioClick = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      setCaptureMode('audio');
      setMediaStream(stream);
    } catch (error) {
      // RE-THROW error so AppContent can handle it and show drawer
      throw error;
    }
  }, []);

  // Device switching handler
  // Properly updates mediaStream state and preserves old stream on failure
  const switchAudioDevice = useCallback(async (deviceId) => {
    const oldStream = mediaStream; // Preserve old stream reference

    try {
      // Get new stream with specific device
      const constraints = {
        audio: deviceId === 'default'
          ? true
          : { deviceId: { exact: deviceId } }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Only stop old stream AFTER new one succeeds
      if (oldStream) {
        oldStream.getTracks().forEach(track => track.stop());
      }

      // Update state with new stream
      setMediaStream(newStream);
      return newStream;
    } catch (error) {
      // oldStream is untouched - audio continues working
      console.error('❌ [HOOK] Failed to switch audio device:', error);
      throw error; // Propagate to AppContent for user feedback
    }
  }, [mediaStream]);

  // Device switching handler for video mode (camera + audio)
  // Properly updates mediaStream state and preserves old stream on failure
  const switchVideoDevice = useCallback(async (deviceId) => {
    const oldStream = mediaStream; // Preserve old stream reference

    try {
      // Get new stream with specific video device
      // Note: Audio uses default device (could be enhanced to allow audio device selection)
      const constraints = {
        video: deviceId === 'default'
          ? true
          : { deviceId: { exact: deviceId } },
        audio: true  // Use default audio device
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Only stop old stream AFTER new one succeeds
      if (oldStream) {
        oldStream.getTracks().forEach(track => track.stop());
      }

      // Update state with new stream
      setMediaStream(newStream);
      return newStream;
    } catch (error) {
      // oldStream is untouched - video/audio continues working
      console.error('❌ [HOOK] Failed to switch video device:', error);
      throw error; // Propagate to AppContent for user feedback
    }
  }, [mediaStream]);

  const handleStartRecording = useCallback(() => {
    if (!mediaStream) return;

    recordedChunksRef.current = [];
    // Timer reset handled by TimerProvider
    
    // Choose supported MIME type
    let mimeType = null;
    const formats = captureMode === 'video' ? SUPPORTED_FORMATS.video : SUPPORTED_FORMATS.audio;
    
    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) {
        mimeType = format;
        break;
      }
    }

    if (!mimeType) {
      console.error('No supported MIME type found');
      return;
    }

    setActualMimeType(mimeType);
    
    const recorder = new MediaRecorder(mediaStream, { mimeType });
    
    recorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
        
        // Data collected for final upload after recording
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlobUrl(url);
      
      // Auto-transition to review mode
      if (onDoneAndSubmitStage) {
        onDoneAndSubmitStage();
      }
    };

    setMediaRecorder(recorder);
    
    startCountdown(() => {
      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      
      // PHASE 2 FIX: Update Firebase status to 'Recording' when recording starts
      if (isFirebaseEnabled && sessionId) {
        updateRecordingSession(sessionId, {
          status: 'Recording',
          recordingStartedAt: new Date()
        }).catch(error => {
          console.warn('Recording status update failed (non-critical):', error);
          firebaseErrorHandler.log('warn', 'Recording status update failed', error, {
            service: 'recording-flow',
            operation: 'status-update-recording',
            sessionId: sessionId
          });
          // Continue recording even if status update fails
        });
      }
      
      // Simple recording - no progressive upload timer needed
    });
  }, [mediaStream, captureMode, startCountdown, onDoneAndSubmitStage, isFirebaseEnabled, sessionId]);

  const handlePause = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.pause();
      setIsPaused(true);
    }
  }, [mediaRecorder, isRecording]);

  const handleResume = useCallback(() => {
    if (mediaRecorder && isPaused) {
      startCountdown(() => {
        mediaRecorder.resume();
        setIsPaused(false);
      });
    }
  }, [mediaRecorder, isPaused, startCountdown]);

  const handleDone = useCallback(() => {
    // Stop recording and prepare for upload
    
    if (mediaRecorder && (isRecording || isPaused)) {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);
      setMediaRecorder(null);
      // Recording stopped - ready for upload
    }
  }, [mediaRecorder, isRecording, isPaused]);

  // Complete reset function for "Start Over" functionality
  const resetRecordingState = useCallback(() => {
    // Clean up recording state
    
    // Stop and clean up media stream and tracks
    stopMediaStream();
    
    // Reset MediaRecorder state
    if (mediaRecorder && (isRecording || isPaused)) {
      mediaRecorder.stop();
    }
    setMediaRecorder(null);
    // MediaRecorder cleared
    
    // Reset recording state
    setIsRecording(false);
    setIsPaused(false);
    // Timer reset handled by TimerProvider
    
    // Clear recorded data
    setRecordedBlobUrl(null);
    setActualMimeType(null);
    recordedChunksRef.current = [];

    // Reset capture mode
    setCaptureMode(null);
  }, [mediaRecorder, isRecording, isPaused, stopMediaStream]);

  // ===========================
  // Return State & Handlers
  // ===========================
  return {
    // State
    captureMode,
    setCaptureMode,
    mediaStream,
    isRecording,
    isPaused,
    // elapsedSeconds moved to TimerContext
    recordedBlobUrl,
    actualMimeType,
    countdownActive,
    countdownValue,
    authState,
    authError,
    
    // Progressive upload removed - using simple upload flow
    
    // Session data (passed through)
    sessionId,
    sessionData,
    sessionComponents,
    
    // Handlers
    handleVideoClick,
    handleAudioClick,
    handleStartRecording,
    handlePause,
    handleResume,
    handleDone,
    stopMediaStream,
    resetRecordingState,
    switchAudioDevice,  // Audio device switching handler
    switchVideoDevice   // Video device switching handler
  };
}