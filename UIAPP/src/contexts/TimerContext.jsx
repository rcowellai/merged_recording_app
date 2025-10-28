/**
 * TimerContext.jsx
 * ----------------
 * Isolated timer state management using React Context.
 * Prevents timer updates from triggering parent component re-renders.
 *
 * Architecture:
 * - TimerProvider manages interval and state
 * - Components subscribe ONLY to timer value they need
 * - Parent components remain stable during timer ticks
 *
 * Benefits:
 * - Zero parent re-renders from timer updates
 * - Clean separation of timer state from recording state
 * - Easy to test and maintain
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { RECORDING_LIMITS } from '../config';

// Create context for timer value
const TimerContext = createContext(null);

/**
 * TimerProvider
 * -------------
 * Manages recording timer state in isolation from parent component tree.
 *
 * @param {Object} props
 * @param {boolean} props.isActive - Whether timer should be running
 * @param {Function} props.onWarning - Callback at WARNING_TIME (840s)
 * @param {Function} props.onMaxDuration - Callback at MAX_DURATION (900s)
 * @param {React.ReactNode} props.children - Child components
 */
export function TimerProvider({ isActive, onWarning, onMaxDuration, children }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalIdRef = useRef(null);
  const warningFiredRef = useRef(false);
  const maxDurationFiredRef = useRef(false);

  /**
   * Reset timer to zero and clear callbacks
   */
  const reset = useCallback(() => {
    setElapsedSeconds(0);
    warningFiredRef.current = false;
    maxDurationFiredRef.current = false;
  }, []);

  /**
   * Timer interval effect
   */
  useEffect(() => {
    if (isActive) {
      // Start interval
      intervalIdRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const newValue = prev >= RECORDING_LIMITS.MAX_DURATION_SECONDS
            ? RECORDING_LIMITS.MAX_DURATION_SECONDS
            : prev + 1;

          // Check for warning threshold (once)
          if (newValue === RECORDING_LIMITS.WARNING_TIME && !warningFiredRef.current) {
            warningFiredRef.current = true;
            if (onWarning) {
              // Use setTimeout to avoid state update during render
              setTimeout(() => onWarning(newValue), 0);
            }
          }

          // Check for max duration (once)
          if (newValue === RECORDING_LIMITS.MAX_DURATION_SECONDS && !maxDurationFiredRef.current) {
            maxDurationFiredRef.current = true;
            if (onMaxDuration) {
              // Use setTimeout to avoid state update during render
              setTimeout(() => onMaxDuration(newValue), 0);
            }
          }

          return newValue;
        });
      }, RECORDING_LIMITS.TIMER_INTERVAL_MS);

      return () => {
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
      };
    } else {
      // Not active - clear interval if exists
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    }
  }, [isActive, onWarning, onMaxDuration]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []);

  const value = {
    elapsedSeconds,
    reset
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}

TimerProvider.propTypes = {
  isActive: PropTypes.bool.isRequired,
  onWarning: PropTypes.func,
  onMaxDuration: PropTypes.func,
  children: PropTypes.node.isRequired
};

/**
 * useTimer
 * --------
 * Hook to access timer value from any component.
 * Only components using this hook will re-render on timer updates.
 *
 * @returns {{elapsedSeconds: number, reset: Function}}
 */
export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider');
  }
  return context;
}
