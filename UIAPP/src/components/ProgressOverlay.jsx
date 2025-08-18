/**
 * ProgressOverlay.jsx
 * -------------------
 * Shows a circular progress bar ("Memories Uploading")
 * during an upload. Uses progressbar.js for the animated
 * circle. Rendered on top of the page while uploading.
 */

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import ProgressBar from 'progressbar.js';
import { COLORS } from '../config';

function ProgressOverlay({ fraction }) {
  const containerRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!circleRef.current) {
      circleRef.current = new ProgressBar.Circle(containerRef.current, {
        strokeWidth: 6,
        trailWidth: 6,
        trailColor: COLORS.BACKGROUND_SECONDARY,
        color: COLORS.PRIMARY_DARK,
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
          color: COLORS.PRIMARY_DARK,
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
