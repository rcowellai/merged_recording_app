/**
 * ChooseModeScreen.jsx
 * --------------------
 * Screen for selecting audio or video recording mode.
 * User chooses between audio-only or video recording.
 * Displayed after user reads the prompt on PromptReadScreen.
 */

import React from 'react';
import { FaMicrophoneAlt, FaVideo } from 'react-icons/fa';

function ChooseModeScreen({ onAudioClick, onVideoClick }) {
  return (
    <div className="two-button-row">
      <button
        type="button"
        className="two-button-left"
        onClick={onAudioClick}
      >
        <FaMicrophoneAlt style={{ marginRight: '8px' }} />
        Audio
      </button>
      <button
        type="button"
        className="two-button-right"
        onClick={onVideoClick}
      >
        <FaVideo style={{ marginRight: '8px' }} />
        Video
      </button>
    </div>
  );
}

export default ChooseModeScreen;
