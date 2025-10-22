/**
 * PromptReadScreen.jsx
 * --------------------
 * First screen in recording flow - displays prompt with Continue button.
 * User reads the prompt before choosing audio or video mode.
 */

import React from 'react';

function PromptReadScreen({ onContinue }) {
  return (
    <button
      type="button"
      className="single-button-full"
      onClick={onContinue}
    >
      Continue
    </button>
  );
}

export default PromptReadScreen;
