/**
 * AudioVisualizer.jsx
 * -------------------
 * Audio spectrum analyzer component using audioMotion-analyzer.
 * Visualizes audio input from MediaStream in real-time.
 *
 * Usage:
 * - Displays placeholder when no MediaStream available
 * - Automatically initializes visualizer when MediaStream provided
 * - Cleans up resources on unmount
 */

import React, { useEffect, useRef } from 'react';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import PropTypes from 'prop-types';

function AudioVisualizer({ mediaStream, height = 200, width = '100%' }) {
  const containerRef = useRef(null);
  const analyzerRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);

  useEffect(() => {
    // Only initialize if we have both container and mediaStream
    if (!containerRef.current || !mediaStream) {
      return;
    }

    try {
      // Create AudioContext
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

      // Create MediaStreamSource node from MediaStream
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(mediaStream);

      console.log('[AudioVisualizer] Created AudioContext and MediaStreamSource');

      // Create AudioMotionAnalyzer instance with AudioNode
      analyzerRef.current = new AudioMotionAnalyzer(containerRef.current, {
        source: sourceNodeRef.current,
        // Mode & Display
        mode: 6,                    // 1/4th octave bands (fewer, thicker bars)
        gradient: 'steelblue',          // Prism gradient
        colorMode: 'gradient',     // Color each bar based on its level
        barSpace: 0.5,              // Spacing between bars
        roundBars: true,            // Rounded bar tops
        channelLayout: 'single',    // Single channel display

        // FFT Configuration
        fftSize: 8192,              // FFT size
        smoothing: 0.7,             // Smoothing factor

        // Frequency Range & Scaling
        minFreq: 30,                // Minimum frequency
        maxFreq: 16000,             // Maximum frequency
        frequencyScale: 'log',      // Logarithmic scale

        // Sensitivity
        weightingFilter: 'D',       // D-weighting filter
        minDecibels: -85,           // Minimum dB threshold
        maxDecibels: -25,           // Maximum dB threshold

        // Linear Amplitude
        linearAmplitude: false,     // Use decibel scale
        linearBoost: 1.6,           // Linear boost

        // Overlay Mode
        overlay: true,              // Allow overlay
        bgAlpha: 0,                 // Transparent background

        // Fill & Line
        fillAlpha: 1,               // Solid bars
        lineWidth: 0,               // No outline

        // Radial (disabled)
        radial: false,              // Linear display
        radius: 0.3,                // Radius setting (not used when radial is off)
        spinSpeed: 0,               // No rotation

        // Reflex & Mirror
        reflexRatio: 0.5,           // Reflection ratio
        reflexAlpha: 1,             // Reflection alpha
        reflexBright: 1,            // Reflection brightness
        reflexFit: true,            // Fit reflection
        mirror: 0,                  // No mirroring

        // Peak Behavior
        showPeaks: false,            // Show peak levels
        peakLine: true,             // Show peak line
        gravity: 3.8,               // Peak fall speed
        peakFadeTime: 750,          // Peak fade time (ms)
        peakHoldTime: 500,          // Peak hold time (ms)

        // Switches & Flags
        alphaBars: false,           // No alpha bars
        ansiBands: false,           // No ANSI bands
        ledBars: false,             // No LED bars
        loRes: false,               // High resolution
        lumiBars: false,            // No luminance bars
        noteLabels: false,          // No note labels
        outlineBars: false,         // No outline bars
        splitGradient: false,       // Single gradient
        trueLeds: false,            // No true LEDs
        showBgColor: false,         // Don't show background color (transparent)
        showScaleX: false,          // No X scale
        showScaleY: false,          // No Y scale
        showFPS: false,             // No FPS counter

        // Audio
        connectSpeakers: false,     // Don't echo to speakers during test
        stereo: false,              // Mono (microphone is mono)
        volume: 1,                  // Full volume for visualization

        // Container
        height: height              // Container height
      });

      console.log('[AudioVisualizer] Analyzer initialized successfully');
    } catch (error) {
      console.error('[AudioVisualizer] Failed to initialize analyzer:', error);
    }

    // Cleanup on unmount or when mediaStream changes
    return () => {
      if (analyzerRef.current) {
        try {
          analyzerRef.current.disconnectInput();
          analyzerRef.current = null;
          console.log('[AudioVisualizer] Analyzer destroyed');
        } catch (error) {
          console.error('[AudioVisualizer] Error destroying analyzer:', error);
        }
      }

      // Disconnect source node
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
          console.log('[AudioVisualizer] Source node disconnected');
        } catch (error) {
          console.error('[AudioVisualizer] Error disconnecting source:', error);
        }
      }

      // Close AudioContext
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
          audioContextRef.current = null;
          console.log('[AudioVisualizer] AudioContext closed');
        } catch (error) {
          console.error('[AudioVisualizer] Error closing AudioContext:', error);
        }
      }
    };
  }, [mediaStream, height, width]);

  // Normalize width to string with units if it's a number
  const widthValue = typeof width === 'number' ? `${width}px` : width;

  return (
    <>
      <style>{`
        .audio-visualizer-container {
          width: ${widthValue};
          max-width: ${widthValue};
          box-sizing: border-box;
        }
        .audio-visualizer-container canvas {
          max-width: ${widthValue} !important;
          width: ${widthValue} !important;
          height: ${height}px !important;
          display: block !important;
          box-sizing: border-box !important;
        }
      `}</style>
      <div
        ref={containerRef}
        className="audio-visualizer-container"
        style={{
          width: widthValue,
          height: `${height}px`,
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: 'transparent',
          display: 'block',
          position: 'relative'
        }}
      >
        {!mediaStream && (
          <div style={{
            color: '#666',
            fontSize: '14px',
            textAlign: 'center',
            padding: '20px',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1
          }}>
            Waiting for microphone access...
          </div>
        )}
      </div>
    </>
  );
}

AudioVisualizer.propTypes = {
  mediaStream: PropTypes.object,
  height: PropTypes.number,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

export default AudioVisualizer;
