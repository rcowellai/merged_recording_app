/**
 * RecordingBar.jsx
 * ----------------
 * Recording status bar displayed in Section A2 header during active/paused recording.
 * Shows compact audio visualizer on left, recording status in red pill container.
 *
 * Layout: [Visualizer (30x56px)] [Red Pill: Icon + "REC" + Timer]
 * Colors: Gray icon + Very light gray text on red background
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { FaPause } from 'react-icons/fa';
import AudioVisualizer from './AudioVisualizer';
import TimerDisplay from './TimerDisplay';
import { useTokens } from '../theme/TokenProvider';

/*
  RecordingBar
  ------------
  Displays recording status widget with visualizer and timer:
    - LEFT: Compact audio visualizer (30px x 56px)
    - RIGHT: Red pill container with [Icon + "REC"] and [Timer "00:15 / 30:00"]

  PROPS:
    totalSeconds (number) - Maximum recording duration
    isRecording (bool) - Whether actively recording
    isPaused (bool) - Whether recording is paused
    formatTime (func) - Time formatting function
    mediaStream (MediaStream) - Audio stream for visualizer (required)

  NOTE: Timer value comes from TimerContext (prevents parent re-renders)
*/

// A custom record icon: open ring with a filled dot in the center
function RecordIcon({ size = 16, color }) {
  const half = size / 2;
  const outerRadius = size / 2 - 1;
  const innerRadius = size / 4;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ marginRight: '4px', flexShrink: 0 }}
    >
      {/* Outer ring */}
      <circle
        cx={half}
        cy={half}
        r={outerRadius}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      {/* Inner dot */}
      <circle
        cx={half}
        cy={half}
        r={innerRadius}
        fill={color}
      />
    </svg>
  );
}

function RecordingBar({
  totalSeconds,
  isRecording,
  isPaused,
  formatTime,
  mediaStream,
  visualizerColor = '#2C2F48'
}) {
  const { tokens } = useTokens();

  // DIAGNOSTIC: Log RecordingBar render (should only happen on state changes, NOT timer ticks)
  console.log('[RecordingBar] 🟦 Component rendered', {
    hasMediaStream: !!mediaStream,
    mediaStreamId: mediaStream?.id,
    isRecording,
    isPaused
  });

  // Container and visualizer dimensions
  const containerHeight = 30; // Fixed height for both visualizer and red container
  const visualizerWidth = 100;
  const visualizerHeight = containerHeight; // Match container height
  const redContainerWidth = 150; // Fixed width for red container

  // Memoize AudioVisualizer to prevent re-render on timer updates
  // IMPORTANT: Must be called before early return (React Hooks rules)
  // Only re-create if mediaStream changes
  const memoizedVisualizer = useMemo(() => {
    if (!mediaStream) return null;
    console.log('[RecordingBar] 🎨 Creating memoized AudioVisualizer');
    return (
      <AudioVisualizer
        mediaStream={mediaStream}
        width={visualizerWidth}
        height={visualizerHeight}
        customGradientColor={visualizerColor}
      />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaStream, visualizerColor]); // mediaStream and visualizerColor

  // If no mediaStream, don't render anything
  if (!mediaStream) {
    console.log('[RecordingBar] ❌ No mediaStream - returning null');
    return null;
  }

  console.log('[RecordingBar] ✅ MediaStream present, will render AudioVisualizer');

  // Format time with leading zeros: "00:15 / 30:00"
  const formatTimeWithLeadingZeros = (sec) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Icon and text colors from token system
  const iconColor = tokens.colors.background.light;  // #ffffff - White
  const textColor = tokens.colors.background.light;  // #ffffff - White
  const redBackground = tokens.colors.status.recording_red;  // #B72A32 - Recording red
  const pausedBackground = tokens.colors.status.pause_background;  // #6A6D6B - Dark gray for paused state

  // Icon size scaled to container height
  const iconSize = 14; // Icon for 30px container

  // Determine status content - compact layout for 100px width
  let statusContent;
  if (isPaused) {
    // Paused state
    statusContent = (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        width: '100%',
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <FaPause style={{ fontSize: '0.75rem', flexShrink: 0 }} />
          <span style={{ fontWeight: tokens.fontWeight.bold, fontSize: '0.65rem' }}>PAUSED</span>
        </div>
        <TimerDisplay
          totalSeconds={totalSeconds}
          formatTime={formatTimeWithLeadingZeros}
          style={{ fontWeight: tokens.fontWeight.normal, fontSize: '0.6rem' }}
        />
      </div>
    );
  } else {
    // Recording state
    statusContent = (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        width: '100%',
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <RecordIcon size={iconSize} color={iconColor} />
          <span style={{ fontWeight: tokens.fontWeight.bold, fontSize: '0.65rem' }}>REC</span>
        </div>
        <TimerDisplay
          totalSeconds={totalSeconds}
          formatTime={formatTimeWithLeadingZeros}
          style={{ fontWeight: tokens.fontWeight.normal, fontSize: '0.6rem' }}
        />
      </div>
    );
  }

  return (
    <>
      <style>{`
        .audio-visualizer-container canvas {
          z-index: 999 !important;
          position: relative !important;
        }
      `}</style>
      <div style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.spacing[2],
        padding: `0 ${tokens.spacing[3]}`,
        boxSizing: 'border-box'
      }}>
        {/* LEFT: AudioVisualizer wrapper */}
        <div style={{
          width: `${visualizerWidth}px`,
          height: `${visualizerHeight}px`,
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          {memoizedVisualizer}
        </div>

        {/* RIGHT: Status Pill Container */}
        <div style={{
          flexShrink: 0,
          backgroundColor: isPaused ? pausedBackground : redBackground,
          borderRadius: tokens.borderRadius.sm, // Minimal rounded corners (2px)
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
          color: textColor,
          boxSizing: 'border-box'
        }}>
          {statusContent}
        </div>
      </div>
    </>
  );
}

RecordingBar.propTypes = {
  totalSeconds: PropTypes.number.isRequired,
  isRecording: PropTypes.bool.isRequired,
  isPaused: PropTypes.bool.isRequired,
  formatTime: PropTypes.func.isRequired,
  mediaStream: PropTypes.object, // MediaStream object for audio visualizer
  visualizerColor: PropTypes.string // Custom color for visualizer bars
};

export default RecordingBar;
