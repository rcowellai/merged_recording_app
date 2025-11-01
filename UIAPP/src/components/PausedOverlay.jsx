/**
 * PausedOverlay.jsx
 * -----------------
 * Semi-transparent overlay that displays "PAUSED" text
 * over SECTION B content area when recording is paused.
 * Uses absolute positioning within parent container.
 *
 * Styling: Matches CountdownOverlay (same colors, same font size)
 */

import React from 'react';
import { useTokens } from '../theme/TokenProvider';

function PausedOverlay() {
  const { tokens } = useTokens();

  // Overlay covers SECTION B content area
  // Uses absolute positioning (parent must have position: relative)
  const overlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: `${tokens.colors.background.recording}ED`, // Semi-transparent recording bg (#1E1F29 @ 93% opacity)
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: tokens.zIndex.pausedOverlay // Paused recording overlay (Layer 5)
  };

  // Large centered "PAUSED" text - reduced size to fit on screen
  const textStyle = {
    fontSize: tokens.fontSize['4xl'], // 36px - fits better than 7rem
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.primary.foreground, // White (#FFFFFF) for contrast
    textAlign: 'center',
    margin: 0,
    padding: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em' // Reduced letter spacing
  };

  return (
    <div style={overlayStyle}>
      <div style={textStyle}>
        PAUSED
      </div>
    </div>
  );
}

export default PausedOverlay;
