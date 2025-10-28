/**
 * AudioRecorder.jsx
 * -----------------
 * Visual component showing a live waveform/mic icon
 * while recording audio. Connects to the user's
 * microphone input stream and draws levels in real time.
 */


import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { FaMicrophoneAlt } from 'react-icons/fa';
import { CANVAS, AUDIO_ANALYSIS } from '../config';
import { useTokens } from '../theme/TokenProvider';

function AudioRecorder({ stream, isRecording }) {
  const { tokens } = useTokens();
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);

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
  }, [isRecording]);

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
    zIndex: 2,
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
