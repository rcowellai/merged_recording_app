/**
 * confettiScreen.jsx
 * ------------------
 * A celebration screen that displays confetti and 
 * provides a link to view the uploaded recording.
 * Shows after successful upload.
 */

import React from 'react';
import PropTypes from 'prop-types';
import Confetti from 'react-confetti';

function ConfettiScreen({ docId }) {
  return (
    <div className="confetti-container">
      <Confetti 
        gravity={0.05}
        wind={0.005}
        initialVelocityY={1}
        numberOfPieces={120}
      />
      
      <div className="confetti-content">
        <div className="confetti-main-title">Memory Saved</div>
        <div className="confetti-subtitle-line">Your story is being crafted</div>
        <div className="confetti-subtitle-line">It will be available to read in the 'My Stories' section shortly.</div>
      </div>
    </div>
  );
}

ConfettiScreen.propTypes = {
  docId: PropTypes.string.isRequired
};

export default ConfettiScreen;