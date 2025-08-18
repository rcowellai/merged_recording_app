/**
 * RecordingBar.jsx
 * ----------------
 * A slim top bar that shows elapsed recording time and
 * whether the user is currently recording or paused.
 * Displays "Rec" in red or "Paused" in gray.
 */


import React from 'react';
import PropTypes from 'prop-types';
import { FaPause } from 'react-icons/fa';
import { COLORS, LAYOUT } from '../config';

/*
  RecordingBar
  ------------
  Displays a top widget:
    - Elapsed time => "mm:ss / mm:ss" (LEFT)
    - On the RIGHT => either "[Custom Record Icon] Rec" in red or "|| Paused" in gray

  PROPS:
    elapsedSeconds (number)
    totalSeconds (number) => from RECORDING_LIMITS.MAX_DURATION_SECONDS
    isRecording (bool)
    isPaused (bool)
    formatTime (func) => shared from App.jsx
*/

// A custom record icon: open ring with a filled dot in the center
// We'll define it as an inline SVG so we can style it easily.
function RecordIcon({ size = LAYOUT.RECORD_ICON_SIZE, color = COLORS.RECORDING_RED }) {
  // size = overall width/height
  // color = stroke/fill color
  const half = size / 2;
  const outerRadius = size / 2 - 1; // a little padding from the edges
  const innerRadius = size / 4; // dot is half the radius of outer
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ marginRight: '4px' }}
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
  elapsedSeconds,
  totalSeconds,
  isRecording,
  isPaused,
  formatTime
}) {
  // Timer on the left
  const leftText = `${formatTime(elapsedSeconds)} / ${formatTime(totalSeconds)}`;

  // Determine the icon + text on the right
  let rightContent;
  if (isPaused) {
    // paused => grey color, pause icon
    rightContent = (
      <div style={{ color: COLORS.INACTIVE_GRAY, display: 'flex', alignItems: 'center', fontWeight: 400 }}>
        <FaPause style={{ marginRight: '4px', fontSize: '1em' }} />
        Paused
      </div>
    );
  } else {
    // recording => red color, custom record icon
    rightContent = (
      <div style={{ color: COLORS.RECORDING_RED, display: 'flex', alignItems: 'center', fontWeight: 400 }}>
        <RecordIcon size={LAYOUT.RECORD_ICON_SIZE} color={COLORS.RECORDING_RED} />
        Rec
      </div>
    );
  }

  // Overall container => matches the prompt box width
  const containerStyle = {
    color: COLORS.INACTIVE_GRAY,
    width: '100%',
    display: 'flex',
    fontWeight: 500,
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.805rem',
    marginBottom: '8px', // Reduced to provide comfortable spacing above prompt
    marginTop: '0', // No top margin needed as position is controlled by container
  };

  return (
    <div style={containerStyle}>
      {/* LEFT => Timer */}
      <div>{leftText}</div>

      {/* RIGHT => Rec or Paused */}
      {rightContent}
    </div>
  );
}

RecordingBar.propTypes = {
  elapsedSeconds: PropTypes.number.isRequired,
  totalSeconds: PropTypes.number.isRequired,
  isRecording: PropTypes.bool.isRequired,
  isPaused: PropTypes.bool.isRequired,
  formatTime: PropTypes.func.isRequired
};

export default RecordingBar;
