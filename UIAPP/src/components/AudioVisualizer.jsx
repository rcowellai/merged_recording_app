/**
 * AudioVisualizer.jsx
 * -------------------
 * Audio spectrum analyzer component using audioMotion-analyzer.
 * Visualizes audio input from MediaStream in real-time.
 *
 * Usage:
 * - Automatically initializes visualizer when MediaStream provided
 * - Cleans up resources on unmount
 * - Used in AudioTest, VideoTest, and RecordingBar after permission granted
 */

import React, { useEffect, useRef } from 'react';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import PropTypes from 'prop-types';

function AudioVisualizer({ mediaStream, height = 200, width = '100%', customGradientColor = '#2C2F48' }) {
  const containerRef = useRef(null);
  const analyzerRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);

  useEffect(() => {
    // Only initialize if we have both container and mediaStream
    if (!containerRef.current) {
      return;
    }

    if (!mediaStream) {
      return;
    }

    // Check mediaStream tracks
    const audioTracks = mediaStream.getAudioTracks();

    if (audioTracks.length === 0) {
      console.error('[AudioVisualizer] ❌ NO AUDIO TRACKS in mediaStream!');
      return;
    }

    try {
      // Create AudioContext
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

      // Create MediaStreamSource node from MediaStream
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(mediaStream);

      // Create AudioMotionAnalyzer instance with AudioNode
      analyzerRef.current = new AudioMotionAnalyzer(containerRef.current, {
        source: sourceNodeRef.current,
        // Mode & Display
        mode: 4,                    // 1/4th octave bands (fewer, thicker bars)
        gradient: 'steelblue',      // Initial gradient (will be replaced)
        colorMode: 'gradient',     // Color each bar based on its level
        barSpace: 0.6,              // Spacing between bars
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
        linearBoost: 1.2,           // Linear boost

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
        volume: 1,                  // Full volume for visualization
        // Note: channelLayout: 'single' is set above (line 57) - replaces deprecated 'stereo: false'

        // Container
        height: height              // Container height
      });

      // Register custom solid color gradient using custom or primary brand color
      analyzerRef.current.registerGradient('primarySolid', {
        colorStops: [
          { pos: 0, color: customGradientColor },
          { pos: 1, color: customGradientColor }
        ]
      });

      // Apply the custom gradient
      analyzerRef.current.gradient = 'primarySolid';

    } catch (error) {
      console.error('[AudioVisualizer] ❌ Failed to initialize analyzer:', error);
      console.error('[AudioVisualizer] Error stack:', error.stack);
    }

    // Cleanup on unmount or when mediaStream changes
    return () => {
      if (analyzerRef.current) {
        try {
          analyzerRef.current.disconnectInput();
          analyzerRef.current = null;
        } catch (error) {
          console.error('[AudioVisualizer] ❌ Error destroying analyzer:', error);
        }
      }

      // Disconnect source node
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
        } catch (error) {
          console.error('[AudioVisualizer] ❌ Error disconnecting source:', error);
        }
      }

      // Close AudioContext
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
          audioContextRef.current = null;
        } catch (error) {
          console.error('[AudioVisualizer] ❌ Error closing AudioContext:', error);
        }
      }
    };
    // PERFORMANCE FIX: height/width are constants from RecordingBar, don't need to trigger re-initialization
    // Only mediaStream or customGradientColor changes should recreate AudioContext/AudioMotionAnalyzer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaStream, customGradientColor]);

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
      </div>
    </>
  );
}

AudioVisualizer.propTypes = {
  mediaStream: PropTypes.object,
  height: PropTypes.number,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  customGradientColor: PropTypes.string
};

export default AudioVisualizer;
