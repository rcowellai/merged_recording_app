/**
 * useRecordingFlow.js
 * -------------------
 * Custom React hook that manages the entire audio/video recording cycle
 * Simplified for React Router architecture - session validation handled by SessionValidator
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { RECORDING_LIMITS, SUPPORTED_FORMATS, ENV_CONFIG } from '../config';
import useCountdown from './useCountdown';

// Firebase services integration (optional)
import { initializeAuth } from '../services/firebase';
import { firebaseErrorHandler } from '../utils/firebaseErrorHandler';

// SLICE-D: Progressive upload integration
import { useProgressiveUpload } from './useProgressiveUpload';

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

  // Elapsed time (up to 30s)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Track the actual MIME type chosen by MediaRecorder
  const [actualMimeType, setActualMimeType] = useState(null);

  // Firebase authentication state (optional)
  const [authState, setAuthState] = useState('idle');
  const [authError, setAuthError] = useState(null);
  
  // Feature flag check
  const isFirebaseEnabled = ENV_CONFIG.USE_FIREBASE;
  
  // SLICE-D: Progressive upload hook integration
  const progressiveUpload = useProgressiveUpload(sessionId, sessionComponents, sessionData);
  const chunkUploadTimer = useRef(null);
  const mediaRecorderRef = useRef(null);

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

  // Clean up media on unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
    };
  }, [stopMediaStream]);

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
      console.error('Video permission denied:', error);
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
      console.error('Audio permission denied:', error);
    }
  }, []);

  const handleStartRecording = useCallback(() => {
    if (!mediaStream) return;

    recordedChunksRef.current = [];
    setElapsedSeconds(0);
    
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
        
        // SLICE-D: Progressive upload during recording
        if (RECORDING_LIMITS.PROGRESSIVE_UPLOAD_ENABLED && 
            mediaRecorderRef.current && 
            mediaRecorderRef.current.state === 'recording') {
          
          console.log('📦 SLICE-D: Processing chunk for progressive upload', {
            chunkSize: event.data.size,
            recordingState: mediaRecorderRef.current.state
          });
          
          // Create chunk blob and upload progressively
          const chunkBlob = new Blob([event.data], { type: event.data.type });
          await progressiveUpload.processRecordingChunk(chunkBlob);
        }
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
    mediaRecorderRef.current = recorder; // SLICE-D: Store ref for progressive upload
    
    startCountdown(() => {
      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      
      // SLICE-D: Start progressive upload timer if enabled
      if (RECORDING_LIMITS.PROGRESSIVE_UPLOAD_ENABLED) {
        console.log('⏱️ SLICE-D: Starting chunk upload timer', {
          interval: RECORDING_LIMITS.CHUNK_UPLOAD_INTERVAL
        });
        
        // Reset progressive upload state for new recording
        progressiveUpload.reset();
        
        chunkUploadTimer.current = setInterval(async () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('📋 SLICE-D: Requesting data for chunk upload');
            mediaRecorderRef.current.requestData();
          }
        }, RECORDING_LIMITS.CHUNK_UPLOAD_INTERVAL * 1000);
      }
    });
  }, [mediaStream, captureMode, startCountdown, onDoneAndSubmitStage]);

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
    // SLICE-D: Stop chunk upload timer
    if (chunkUploadTimer.current) {
      console.log('🛑 SLICE-D: Stopping chunk upload timer');
      clearInterval(chunkUploadTimer.current);
      chunkUploadTimer.current = null;
    }
    
    if (mediaRecorder && (isRecording || isPaused)) {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);
      setMediaRecorder(null);
      mediaRecorderRef.current = null; // SLICE-D: Clear ref
    }
  }, [mediaRecorder, isRecording, isPaused]);

  // Complete reset function for "Start Over" functionality
  const resetRecordingState = useCallback(() => {
    // SLICE-D: Stop chunk upload timer and cleanup progressive upload
    if (chunkUploadTimer.current) {
      clearInterval(chunkUploadTimer.current);
      chunkUploadTimer.current = null;
    }
    
    // Stop and clean up media stream and tracks
    stopMediaStream();
    
    // Reset MediaRecorder state
    if (mediaRecorder && (isRecording || isPaused)) {
      mediaRecorder.stop();
    }
    setMediaRecorder(null);
    mediaRecorderRef.current = null; // SLICE-D: Clear ref
    
    // Reset recording state
    setIsRecording(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    
    // Clear recorded data
    setRecordedBlobUrl(null);
    setActualMimeType(null);
    recordedChunksRef.current = [];
    
    // Reset capture mode
    setCaptureMode(null);
    
    // SLICE-D: Reset progressive upload state
    progressiveUpload.reset();
    
    console.log('🔄 SLICE-D: Recording state completely reset for start over');
  }, [mediaRecorder, isRecording, isPaused, stopMediaStream, progressiveUpload]);

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
    elapsedSeconds,
    recordedBlobUrl,
    actualMimeType,
    countdownActive,
    countdownValue,
    authState,
    authError,
    
    // SLICE-D: Progressive upload state
    progressiveUpload,
    chunksUploaded: progressiveUpload.chunksUploaded,
    uploadProgress: progressiveUpload.uploadProgress,
    uploadError: progressiveUpload.uploadError,
    
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
    resetRecordingState
  };
}