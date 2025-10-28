/**
 * TimerDisplay.jsx
 * ----------------
 * Isolated timer display component that subscribes to TimerContext.
 * This component re-renders every second, but its parent does NOT.
 *
 * Architecture:
 * - Subscribes to TimerContext via useTimer hook
 * - Re-renders independently when timer ticks
 * - Parent component (RecordingBar) remains stable
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTimer } from '../contexts/TimerContext';

/**
 * TimerDisplay
 * ------------
 * Displays formatted timer value from TimerContext.
 *
 * @param {Object} props
 * @param {number} props.totalSeconds - Maximum duration for display
 * @param {Function} props.formatTime - Function to format seconds as string
 * @param {Object} props.style - Additional styles for the display element
 */
function TimerDisplay({ totalSeconds, formatTime, style = {} }) {
  const { elapsedSeconds } = useTimer();

  const timerText = `${formatTime(elapsedSeconds)} / ${formatTime(totalSeconds)}`;

  return (
    <span style={style}>
      {timerText}
    </span>
  );
}

TimerDisplay.propTypes = {
  totalSeconds: PropTypes.number.isRequired,
  formatTime: PropTypes.func.isRequired,
  style: PropTypes.object
};

export default TimerDisplay;
