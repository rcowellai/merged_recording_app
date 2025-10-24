/**
 * PausedRecordingScreen.jsx
 * -------------------------
 * Shows "Resume" and "Done" buttons when recording is paused.
 * User can continue recording or finish and review.
 *
 * Returns standard screen format:
 * - timer: null (RecordingBar managed separately in AppContent)
 * - content: PromptCard with session data (Section B - green border)
 * - actions: Resume and Done buttons (Section C - purple border)
 */

import React from 'react';
import { FaPlay } from 'react-icons/fa';
import PromptCard from '../PromptCard';

function PausedRecordingScreen({ onResume, onDone, sessionData, onBack }) {
  return {
    timer: null,
    content: <PromptCard sessionData={sessionData} />,
    actions: (
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
    ),
    onBack
  };
}

export default PausedRecordingScreen;
