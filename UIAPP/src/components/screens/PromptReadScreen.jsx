/**
 * PromptReadScreen.jsx
 * --------------------
 * First screen in recording flow - displays prompt with Continue button.
 * User reads the prompt before choosing audio or video mode.
 *
 * Returns standard screen format:
 * - timer: null
 * - content: PromptCard with session data
 * - actions: Continue button
 */

import React from 'react';
import PromptCard from '../PromptCard';

function PromptReadScreen({ sessionData, onContinue, onBack }) {
  return {
    bannerContent: 'Your prompt',
    content: <PromptCard sessionData={sessionData} />,
    actions: (
      <button
        type="button"
        className="single-button-full"
        onClick={onContinue}
      >
        Continue
      </button>
    ),
    onBack
  };
}

export default PromptReadScreen;
