/**
 * AudioRecorder.jsx
 * -----------------
 * Live Audio Waveform Visualizer
 *
 * PURPOSE:
 * Visual component that displays a live animated waveform during audio recording,
 * providing real-time feedback of microphone input levels.
 *
 * RESPONSIBILITIES:
 * - Connect to user's microphone MediaStream via Web Audio API
 * - Create AudioContext and AnalyserNode for frequency analysis
 * - Render animated waveform on HTML5 canvas with real-time updates
 * - Visualize audio amplitude with configurable sensitivity
 * - Clean up audio resources on component unmount
 *
 * USED BY:
 * - ActiveRecordingScreen.jsx (during audio recording sessions)
 *
 * CURRENT STATUS:
 * ⚠️ TEMPORARILY DISABLED (line 27-28)
 * - Testing for AudioContext conflict with AudioVisualizer component
 * - Returns early to prevent dual AudioContext creation
 * - Audio recording still works, visualization is disabled
 *
 * TECHNICAL DETAILS:
 * - Web Audio API: AudioContext, MediaStreamSourceNode, AnalyserNode
 * - FFT analysis: Uses frequency bin data for waveform generation
 * - Canvas rendering: 2D context with configurable stroke width and color
 * - Configuration: Uses CANVAS and AUDIO_ANALYSIS constants from config
 * - Styling: Design tokens from TokenProvider for colors
 *
 * PROPS:
 * - stream (MediaStream): User's microphone audio stream
 * - isRecording (boolean): Whether recording is active
 *
 * VISUALIZATION:
 * - Waveform drawn from left to right across canvas
 * - Amplitude mapped to vertical displacement from center
 * - Sensitivity factor applied for visual enhancement
 * - Background matches token-based light background color
 * - Stroke color uses recording red status color
 */


import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { FaMicrophoneAlt } from 'react-icons/fa';
import { CANVAS } from '../config';
import { useTokens } from '../theme/TokenProvider';

function AudioRecorder({ stream, isRecording }) {
  const { tokens } = useTokens();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!stream || !isRecording) return undefined;

    // TEMPORARY DISABLE: Testing AudioContext conflict with AudioVisualizer
    console.log('[AudioRecorder] DISABLED - Testing visualizer conflict');
    return undefined;

    // COMMENTED OUT TO TEST CONFLICT:
    /*
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = AUDIO_ANALYSIS.FFT_SIZE;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new AUDIO_ANALYSIS.DATA_TYPE(bufferLength);

    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Canvas dimensions and positioning from constants
    const centerY = CANVAS.CENTER_Y;
    const offsetX = CANVAS.OFFSET_X;
    const waveWidth = CANVAS.WAVE_WIDTH;
    const waveHeight = CANVAS.WAVE_HEIGHT;
    const sensitivityFactor = CANVAS.SENSITIVITY_FACTOR;

    function draw() {
      if (!analyserRef.current || !dataArrayRef.current) {
        requestAnimationFrame(draw);
        return;
      }

      analyser.getByteTimeDomainData(dataArrayRef.current);

      // Clear entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fill the background to match the box color
      ctx.fillStyle = tokens.colors.background.light;
      ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

      ctx.lineWidth = 2;
      ctx.strokeStyle = tokens.colors.status.recording_red;
      ctx.beginPath();

      // Normalize and process audio data using constants
      const sliceWidth = waveWidth / bufferLength;
      let xPos = offsetX;

      for (let i = 0; i < bufferLength; i++) {
        let v = dataArrayRef.current[i] / AUDIO_ANALYSIS.NORMALIZATION_FACTOR;    // 0..2
        v = (v - AUDIO_ANALYSIS.CENTERING_OFFSET) * sensitivityFactor;          // -1..+1 => scaled

        // Convert that range into a Y offset from center
        const y = centerY + (v * (waveHeight / 2));
        if (i === 0) {
          ctx.moveTo(xPos, y);
        } else {
          ctx.lineTo(xPos, y);
        }
        xPos += sliceWidth;
      }

      ctx.stroke();
      requestAnimationFrame(draw);
    }
    draw();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      dataArrayRef.current = null;
    };
    */
  }, [stream, isRecording]);

  // If not recording, draw diagonal slash
  useEffect(() => {
    if (isRecording) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Fill
    ctx.fillStyle = tokens.colors.background.light;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // slash
    ctx.strokeStyle = tokens.colors.neutral.gray['01'];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS.OFFSET_X, CANVAS.OFFSET_X);
    ctx.lineTo(CANVAS.WIDTH - CANVAS.OFFSET_X, CANVAS.HEIGHT - CANVAS.OFFSET_X);
    ctx.stroke();
  }, [isRecording, tokens.colors.background.light, tokens.colors.neutral.gray]);

  // Container styling
  const containerStyle = {
    width: '100%',
    height: '100%',
    backgroundColor: tokens.colors.background.light,
    borderRadius: '8px',
    boxSizing: 'border-box',
    padding: '8px',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // Canvas covers the container area
  const canvasStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  };

  // Mic icon => bigger if recording
  const iconStyle = {
    fontSize: '1.8rem',
    color: isRecording ? tokens.colors.status.recording_red : tokens.colors.neutral.gray['01'],
    zIndex: tokens.zIndex.audioRecorder, // Audio recorder component (Layer 0)
  };

  return (
    <div style={containerStyle}>
      <canvas
        ref={canvasRef}
        width={CANVAS.WIDTH}
        height={CANVAS.HEIGHT}
        style={canvasStyle}
      />
      <FaMicrophoneAlt style={iconStyle} />
    </div>
  );
}

AudioRecorder.propTypes = {
  stream: PropTypes.object, // MediaStream object or null
  isRecording: PropTypes.bool.isRequired
};

export default AudioRecorder;
