/**
 * useRecordingFlow.js
 * -------------------
 * Custom React hook that manages the entire audio/video recording cycle
 * Simplified for React Router architecture - session validation handled by SessionValidator
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { SUPPORTED_FORMATS, ENV_CONFIG } from '../config';
import useCountdown from './useCountdown';
import { serverTimestamp } from 'firebase/firestore';
import { debugService } from '../utils/DebugService';

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
  const isMountedRef = useRef(true);
  const navigationTimeoutRef = useRef(null);
  const cleanupTimeoutRef = useRef(null);        // Track 200ms cleanup timeout
  const skipNavigationRef = useRef(false);        // Control navigation in onstop

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // iOS HOT MIC FIX: Track stream loading state to prevent race condition
  // Prevents auto-retry logic from firing while stream is being created
  const [isStreamLoading, setIsStreamLoading] = useState(false);

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

  // SESSION_VALIDATION_FIX: Auth initialization removed from critical path
  // Per SESSION_VALIDATION_FIX.md lines 56, 477:
  // - "Anonymous auth requirement adds unnecessary 200-500ms delay"
  // - "No authentication wait required (rules allow unauthenticated document reads)"
  // Auth now initialized only when needed for upload operations (see handleStartRecording)

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
      // Mark component as unmounted
      isMountedRef.current = false;

      // Clear any pending navigation timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }

      // Clear any pending early cleanup timeout
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }

      // Use ref to get latest stream value at cleanup time
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          // Only stop if track is still active
          if (track.readyState === 'live') {
            try {
              track.stop();
            } catch (err) {
              // Ignore - track might already be stopped by onstop handler
            }
          }
        });
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
    debugService.log('FLOW', 'handleVideoClick: Requesting video stream...');

    // iOS HOT MIC FIX: Set loading state BEFORE async operation
    setIsStreamLoading(true);
    debugService.log('FLOW', 'isStreamLoading: false → true');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      // TAG IT - Mark source for leak detection
      stream._debugTag = 'Flow_MainVideo';
      debugService.trackStream(stream);
      debugService.log('HARDWARE', 'Flow: Main video stream created', stream);
      setCaptureMode('video');
      setMediaStream(stream);
    } catch (error) {
      debugService.log('FLOW', 'handleVideoClick failed', error);
      // RE-THROW error so AppContent can handle it and show drawer
      throw error;
    } finally {
      // iOS HOT MIC FIX: Always clear loading state (success or error)
      setIsStreamLoading(false);
      debugService.log('FLOW', 'isStreamLoading: true → false');
    }
  }, []);

  const handleAudioClick = useCallback(async () => {
    debugService.log('FLOW', 'handleAudioClick: Requesting audio stream...');

    // iOS HOT MIC FIX: Set loading state BEFORE async operation
    setIsStreamLoading(true);
    debugService.log('FLOW', 'isStreamLoading: false → true');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      // TAG IT - Mark source for leak detection
      stream._debugTag = 'Flow_MainAudio';
      debugService.trackStream(stream);
      debugService.log('HARDWARE', 'Flow: Main audio stream created', stream);
      setCaptureMode('audio');
      setMediaStream(stream);
    } catch (error) {
      debugService.log('FLOW', 'handleAudioClick failed', error);
      // RE-THROW error so AppContent can handle it and show drawer
      throw error;
    } finally {
      // iOS HOT MIC FIX: Always clear loading state (success or error)
      setIsStreamLoading(false);
      debugService.log('FLOW', 'isStreamLoading: true → false');
    }
  }, []);

  // Device switching handler
  // Properly updates mediaStream state and preserves old stream on failure
  const switchAudioDevice = useCallback(async (deviceId) => {
    const oldStream = mediaStream; // Preserve old stream reference

    // iOS HOT MIC FIX: Set loading state during device switch
    setIsStreamLoading(true);
    debugService.log('FLOW', 'switchAudioDevice: isStreamLoading → true');

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
      debugService.log('HARDWARE', 'Audio device switched successfully');
      return newStream;
    } catch (error) {
      // oldStream is untouched - audio continues working
      console.error('❌ [HOOK] Failed to switch audio device:', error);
      debugService.log('FLOW', 'switchAudioDevice failed', error);
      throw error; // Propagate to AppContent for user feedback
    } finally {
      // iOS HOT MIC FIX: Always clear loading state
      setIsStreamLoading(false);
      debugService.log('FLOW', 'isStreamLoading: true → false');
    }
  }, [mediaStream]);

  // Device switching handler for video mode (camera + audio)
  // Properly updates mediaStream state and preserves old stream on failure
  const switchVideoDevice = useCallback(async (deviceId) => {
    const oldStream = mediaStream; // Preserve old stream reference

    // iOS HOT MIC FIX: Set loading state during device switch
    setIsStreamLoading(true);
    debugService.log('FLOW', 'switchVideoDevice: isStreamLoading → true');

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
      debugService.log('HARDWARE', 'Video device switched successfully');
      return newStream;
    } catch (error) {
      // oldStream is untouched - video/audio continues working
      console.error('❌ [HOOK] Failed to switch video device:', error);
      debugService.log('FLOW', 'switchVideoDevice failed', error);
      throw error; // Propagate to AppContent for user feedback
    } finally {
      // iOS HOT MIC FIX: Always clear loading state
      setIsStreamLoading(false);
      debugService.log('FLOW', 'isStreamLoading: true → false');
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

    let onstopExecuted = false; // Idempotency flag

    recorder.onstop = () => {
      // Prevent multiple executions (defensive programming)
      if (onstopExecuted) {
        console.warn('[useRecordingFlow] ⚠️ onstop fired multiple times, ignoring duplicate');
        return;
      }
      onstopExecuted = true;

      debugService.log('RECORDER', 'onstop handler executing');

      try {
        // 1. REDUNDANT HARDWARE CLEANUP (Safety Net)
        // Tracks are likely already stopped by 200ms timeout in handleDone,
        // but we ensure cleanup here as a safety measure. track.stop() is idempotent.
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => {
            try {
              track.stop();
              console.log('[useRecordingFlow] 🛡️ Redundant cleanup: stopped track (onstop)');
              debugService.log('HARDWARE', `Redundant cleanup: ${track.kind} track`, track);
            } catch (err) {
              // Ignore - track likely already stopped by early cleanup
            }
          });
        }

        // 2. CHECK MOUNT STATUS
        if (!isMountedRef.current) return;

        // 3. STATE CLEANUP
        setMediaStream(null);
        debugService.setRecorderState('inactive');

        // 4. BLOB CREATION & NAVIGATION (skip if reset flow)
        if (!skipNavigationRef.current) {
          // Create blob for playback
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          setRecordedBlobUrl(url);
          debugService.log('RECORDER', `Recording complete: ${blob.size} bytes`);

          // Navigate to review screen
          // Privacy indicators are likely already off thanks to early cleanup
          if (onDoneAndSubmitStage) {
            navigationTimeoutRef.current = setTimeout(() => {
              navigationTimeoutRef.current = null;
              if (isMountedRef.current) {
                onDoneAndSubmitStage();
              }
            }, 100); // Keep delay for safety
          }
        }

        // Reset skip flag for next recording
        skipNavigationRef.current = false;

      } catch (error) {
        console.error('[useRecordingFlow] ❌ Error in onstop handler:', error);
        // Still attempt cleanup on error
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => {
            try { track.stop(); } catch (err) { /* ignore */ }
          });
        }
        if (isMountedRef.current) {
          setMediaStream(null);
          setIsRecording(false);
        }
      }
    };

    setMediaRecorder(recorder);
    
    startCountdown(() => {
      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      debugService.setRecorderState('recording');
      debugService.log('RECORDER', 'Recording started');

      // SESSION_VALIDATION_FIX: Initialize auth when recording starts (deferred from mount)
      // Auth only needed for Firebase write operations, not for session validation
      if (isFirebaseEnabled && sessionId && authState === 'idle') {
        setAuthState('initializing');
        initializeAuth()
          .then((user) => {
            setAuthState('authenticated');

            // Small delay to ensure auth propagates before write operation
            return new Promise(resolve => setTimeout(resolve, 100));
          })
          .then(() => {
            // Update Firebase status to 'Recording' after auth is fully ready
            return updateRecordingSession(sessionId, {
              status: 'Recording',
              recordingStartedAt: serverTimestamp()
            });
          })
          .catch(error => {
            console.error('🔴 [HOOK] Auth initialization or status update failed (non-critical):', error);
            console.error('🔴 [HOOK] Error type:', error.type);
            console.error('🔴 [HOOK] Error message:', error.message);
            console.error('🔴 [HOOK] Original error:', error.originalError);
            console.error('🔴 [HOOK] Full error object:', error);
            setAuthState('error');
            setAuthError(error);
            firebaseErrorHandler.log('warn', 'Auth or recording status update failed', error, {
              service: 'recording-flow',
              operation: 'auth-and-status-update',
              sessionId: sessionId
            });
            // Continue recording even if auth/status update fails
          });
      } else if (isFirebaseEnabled && sessionId && authState === 'authenticated') {
        // Auth already initialized, just update status
        updateRecordingSession(sessionId, {
          status: 'Recording',
          recordingStartedAt: serverTimestamp()
        }).catch(error => {
          console.error('🔴 [HOOK] Recording status update failed (non-critical):', error);
          console.error('🔴 [HOOK] Error type:', error.type);
          console.error('🔴 [HOOK] Error message:', error.message);
          console.error('🔴 [HOOK] Original error:', error.originalError);
          console.error('🔴 [HOOK] Full error object:', error);
          firebaseErrorHandler.log('warn', 'Recording status update failed', error, {
            service: 'recording-flow',
            operation: 'status-update-recording',
            sessionId: sessionId
          });
        });
      }

      // Simple recording - no progressive upload timer needed
    });
  }, [mediaStream, captureMode, startCountdown, onDoneAndSubmitStage, isFirebaseEnabled, sessionId, authState]);

  const handlePause = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.pause();
      setIsPaused(true);
      debugService.setRecorderState('paused');
      debugService.log('RECORDER', 'Recording paused');
    }
  }, [mediaRecorder, isRecording]);

  const handleResume = useCallback(() => {
    if (mediaRecorder && isPaused) {
      startCountdown(() => {
        mediaRecorder.resume();
        setIsPaused(false);
        debugService.setRecorderState('recording');
        debugService.log('RECORDER', 'Recording resumed');
      });
    }
  }, [mediaRecorder, isPaused, startCountdown]);

  const handleDone = useCallback(() => {
    // OPTIMIZATION: Stop tracks 200ms after recorder.stop() for fast UX
    // Recorder gets time to register stop signal, but tracks stop before file encoding completes
    // onstop handler provides redundant cleanup for safety

    debugService.log('UI', 'User clicked Done');

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      // Capture current stream in closure scope (critical for correctness)
      const streamToStop = mediaStream;

      // 1. Signal the recorder to stop (starts async file encoding)
      mediaRecorder.stop();
      debugService.setRecorderState('stopping');
      debugService.log('RECORDER', 'Recording stop requested');

      // 2. OPTIMIZATION: Schedule early hardware cleanup
      // 200ms gives recorder time to process stop signal, but is much faster than
      // waiting for file encoding (500ms-2s). Privacy indicators clear almost immediately.
      cleanupTimeoutRef.current = setTimeout(() => {
        cleanupTimeoutRef.current = null; // Clear ref when executing

        debugService.log('HARDWARE', 'Early cleanup: stopping tracks (200ms buffer)');

        // Stop tracks using closure variable (not React state)
        // This ensures we stop the exact stream that was recording, bypassing React batching
        if (streamToStop) {
          streamToStop.getTracks().forEach(track => {
            try {
              track.stop();
              console.log('[useRecordingFlow] ⚡ Early cleanup: stopped track (200ms buffer)');
              debugService.log('HARDWARE', `Track stopped: ${track.kind}`, track);
            } catch (e) {
              // Ignore - track might already be stopped
            }
          });
        }
      }, 200);

      // 3. Reset internal hook state
      setIsRecording(false);
      setIsPaused(false);
      setMediaRecorder(null);

      // Note: We do NOT call setMediaStream(null) here
      // onstop will handle state cleanup and navigation after file is ready
    }
  }, [mediaRecorder, isRecording, isPaused, mediaStream]);

  // Complete reset function for "Start Over" functionality
  const resetRecordingState = useCallback(() => {
    // Clean up recording state
    // NOTE: If recorder is active, both early cleanup and onstop will handle tracks
    // If recorder is already stopped OR doesn't exist, manual cleanup required

    const recorderIsActive = mediaRecorder && (isRecording || isPaused);

    // Reset MediaRecorder state (triggers onstop if active)
    if (recorderIsActive) {
      // Set flag to skip navigation in onstop handler
      skipNavigationRef.current = true;

      mediaRecorder.stop(); // Triggers both 200ms early cleanup AND onstop
    }
    setMediaRecorder(null);

    // Manual cleanup only if recorder wasn't active
    // (if recorder was active, early cleanup + onstop handles it)
    if (!recorderIsActive) {
      stopMediaStream();
    }

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
    isStreamLoading,  // iOS HOT MIC FIX: Expose loading state
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