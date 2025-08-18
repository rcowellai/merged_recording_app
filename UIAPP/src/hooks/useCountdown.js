/**
 * useCountdown.js
 * ---------------
 * Reusable countdown hook that manages countdown state and provides
 * a simple interface for starting countdowns with configurable steps.
 * Eliminates duplicated countdown logic throughout the application.
 */

import { useState } from 'react';
import { RECORDING_LIMITS } from '../config';

export default function useCountdown() {
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownValue, setCountdownValue] = useState(null);

  /**
   * Start a countdown sequence
   * @param {Function} onComplete - Callback function to execute when countdown finishes
   * @param {Array} steps - Array of countdown steps (defaults to RECORDING_LIMITS.COUNTDOWN_STEPS)
   */
  const startCountdown = (onComplete, steps = RECORDING_LIMITS.COUNTDOWN_STEPS) => {
    setCountdownActive(true);
    let index = 0;
    setCountdownValue(steps[index]);

    const intervalId = setInterval(() => {
      index += 1;
      if (index < steps.length) {
        setCountdownValue(steps[index]);
      } else {
        clearInterval(intervalId);
        setCountdownActive(false);
        // Execute the provided completion callback
        if (onComplete && typeof onComplete === 'function') {
          onComplete();
        }
      }
    }, 1000);

    // Return cleanup function for manual cancellation if needed
    return () => {
      clearInterval(intervalId);
      setCountdownActive(false);
      setCountdownValue(null);
    };
  };

  /**
   * Stop countdown manually if needed
   */
  const stopCountdown = () => {
    setCountdownActive(false);
    setCountdownValue(null);
  };

  return {
    countdownActive,
    countdownValue,
    startCountdown,
    stopCountdown
  };
}