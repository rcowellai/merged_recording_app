/**
 * PausedRecordingScreen.jsx
 * -------------------------
 * Shows "Resume" and "Done" buttons when recording is paused.
 * User can continue recording or finish and review.
 */

import React from 'react';
import { FaPlay } from 'react-icons/fa';

function PausedRecordingScreen({ onResume, onDone }) {
  return (
    <div className="two-button-row">
      <button
        type="button"
        className="two-button-left"
        onClick={onResume}
      >
        <FaPlay style={{ marginRight: '8px' }} />
        Resume
      </button>
      <button
        type="button"
        className="two-button-right"
        onClick={onDone}
      >
        Done
      </button>
    </div>
  );
}

export default PausedRecordingScreen;
