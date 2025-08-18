/**
 * useRecordingFlow.js
 * -------------------
 * Custom React hook that manages the entire audio/video
 * recording cycle:
 *   - Getting media permissions
 *   - Handling pause, resume
 *   - 30-second timer (capped, but no auto-stop)
 *   - Generating a Blob URL of the final recording
 *
 * Helps keep App.jsx lean by encapsulating recording logic.
 */

import { useState, useRef, useEffect } from 'react';
import { RECORDING_LIMITS, SUPPORTED_FORMATS } from '../config';
import useCountdown from './useCountdown';
import { createError, UPLOAD_ERRORS } from '../utils/errors';

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
  // Permission & Capture Setup
  // ===========================
  async function handleVideoClick() {
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

    handleVideoClick,
    handleAudioClick,
    handleStartRecording,
    handlePause,
    handleResume,
    handleDone,

    // We also expose setCaptureMode if your UI needs it
    setCaptureMode,
  };
}
