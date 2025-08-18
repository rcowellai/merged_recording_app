/**
 * CountdownOverlay.jsx
 * ---------------------
 * A semi-transparent overlay that displays a countdown
 * from 3 to 1 before recording starts. Shows in the
 * center of the screen with large, clear numbers.
 */

import React from 'react';
import PropTypes from 'prop-types';

function CountdownOverlay({ countdownValue }) {
  return (
    <div className="countdown-overlay">
      <div className="countdown-text">
        {countdownValue}
      </div>
    </div>
  );
}

CountdownOverlay.propTypes = {
  countdownValue: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ]).isRequired
};

export default CountdownOverlay;