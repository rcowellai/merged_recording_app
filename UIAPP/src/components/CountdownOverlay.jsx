/**
 * CountdownOverlay.jsx
 * ---------------------
 * A semi-transparent overlay that displays a countdown
 * from 3 to 1 before recording starts. Shows in the
 * center of the screen with large, clear numbers.
 *
 * Styling: Token-based inline styles (no CSS classes)
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTokens } from '../theme/TokenProvider';

function CountdownOverlay({ countdownValue }) {
  const { tokens } = useTokens();

  // Full-screen overlay with semi-transparent background
  // Covers ENTIRE viewport including Section A (header)
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: `${tokens.colors.primary.DEFAULT}ED`, // Semi-transparent primary (#2C2F48 @ 93% opacity)
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: tokens.zIndex.countdownOverlay // Full-screen countdown overlay (Layer 7)
  };

  // Large centered countdown text
  const textStyle = {
    fontSize: '7rem', // 112px - intentionally large for visibility
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.primary.foreground, // White (#FFFFFF) for contrast
    textAlign: 'center',
    margin: 0,
    padding: 0
  };

  return (
    <div style={overlayStyle}>
      <div style={textStyle}>
        {countdownValue}
      </div>
    </div>
  );
}

CountdownOverlay.propTypes = {
  countdownValue: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ]).isRequired
};

export default CountdownOverlay;