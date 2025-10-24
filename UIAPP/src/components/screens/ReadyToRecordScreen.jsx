/**
 * ReadyToRecordScreen.jsx
 * -----------------------
 * Displays prompt card with single "RECORD" button to begin recording.
 * Simplified interface without preview - user clicks green button to start.
 *
 * Returns standard screen format:
 * - timer: null
 * - content: PromptCard with session data
 * - actions: Single full-width green "RECORD" button
 */

import React from 'react';
import { FaChevronDown } from 'react-icons/fa';
import PromptCard from '../PromptCard';

function ReadyToRecordScreen({ captureMode, mediaStream, onStartRecording, sessionData, onBack }) {
  return {
    bannerContent: "You're ready to record",
    content: (
      <>
        <PromptCard sessionData={sessionData} />
        {/* Bouncing arrow indicator - positioned flush at bottom of SECTION B (screen-specific override) */}
        <div className="bounce-arrow-container" style={{ bottom: 0 }}>
          <FaChevronDown className="bounce-arrow" style={{ margin: 0, padding: 0 }} />
        </div>
      </>
    ),
    actions: (
      <button
        type="button"
        className="single-button-full green-button"
        onClick={onStartRecording}
      >
        RECORD
      </button>
    ),
    onBack
  };
}

export default ReadyToRecordScreen;
