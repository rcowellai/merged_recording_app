/**
 * ProgressOverlay.jsx
 * -------------------
 * Upload Progress Overlay with Circular Progress Bar
 *
 * PURPOSE:
 * Full-screen overlay that displays upload progress during recording submission,
 * preventing user interaction until upload completes or fails.
 *
 * RESPONSIBILITIES:
 * - Display "Memories Uploading" message with animated circular progress
 * - Render smooth progress animation from 0% to 100%
 * - Block user interaction during upload (z-index: 9999)
 * - Cover entire viewport with semi-transparent backdrop
 * - Update progress in real-time based on upload fraction
 *
 * USED BY:
 * - AppContent.jsx (conditionally rendered when appState.uploadInProgress === true)
 *
 * RENDER CONDITION:
 * {appState.uploadInProgress && (
 *   <ProgressOverlay fraction={appState.uploadFraction} />
 * )}
 *
 * PROPS:
 * - fraction (number, required): Upload progress from 0.0 to 1.0
 *   - 0.0 = 0% (upload start)
 *   - 0.5 = 50% (halfway)
 *   - 1.0 = 100% (upload complete)
 *
 * TECHNICAL DETAILS:
 * - progressbar.js library: Circular progress animation
 * - Animation config:
 *   - strokeWidth: 6px (progress ring thickness)
 *   - trailWidth: 6px (background ring thickness)
 *   - easing: 'easeInOut' (smooth acceleration/deceleration)
 *   - duration: 200ms (animation speed)
 * - Progress circle: 120px × 120px
 * - Styling: Design tokens from TokenProvider
 *
 * VISUAL DESIGN:
 * - Fixed position overlay (covers entire viewport)
 * - Semi-transparent beige background: rgba(228,226,216,0.93)
 * - Centered content (vertically and horizontally)
 * - Primary color for progress bar stroke
 * - Light background for progress trail
 *
 * USER EXPERIENCE:
 * - Prevents accidental navigation during critical upload
 * - Shows real-time progress feedback
 * - Smooth animations for professional feel
 * - Non-dismissible until upload completes (no close button)
 */

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import ProgressBar from 'progressbar.js';
import { useTokens } from '../theme/TokenProvider';

function ProgressOverlay({ fraction }) {
  const { tokens } = useTokens();
  const containerRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!circleRef.current) {
      circleRef.current = new ProgressBar.Circle(containerRef.current, {
        strokeWidth: 6,
        trailWidth: 6,
        trailColor: tokens.colors.background.light,
        color: tokens.colors.primary.DEFAULT,
        easing: 'easeInOut',
        duration: 200,
      });
    }
    circleRef.current.animate(fraction);
  }, [fraction]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(228,226,216,0.93)', // Using raw rgba to maintain transparency
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          marginBottom: '25px',
          fontSize: '1.25rem',
          color: tokens.colors.primary.DEFAULT,
        }}
      >
        Memories Uploading
      </div>
      <div ref={containerRef} style={{ width: '120px', height: '120px' }} />
    </div>
  );
}

ProgressOverlay.propTypes = {
  fraction: PropTypes.number.isRequired
};

export default ProgressOverlay;
