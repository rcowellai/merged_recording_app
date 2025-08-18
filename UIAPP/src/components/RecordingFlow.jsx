/**
 * RecordingFlow.jsx
 * -----------------
 * Manages the recording state and auto-transition logic.
 * Extracts recording flow concerns from App.js while preserving exact behavior.
 */

import { useEffect } from 'react';
import { RECORDING_LIMITS } from '../config';
import useRecordingFlow from '../hooks/useRecordingFlow';

function RecordingFlow({ 
  onDoneAndSubmitStage,
  children 
}) {
  // Get recording flow state and handlers
  const recordingFlowState = useRecordingFlow();
  const { elapsedSeconds, isRecording, isPaused } = recordingFlowState;

  // Auto-transition at max duration (preserves exact logic from App.js:97-101)
  useEffect(() => {
    if (elapsedSeconds >= RECORDING_LIMITS.MAX_DURATION_SECONDS && isRecording && !isPaused) {
      // Stop recording first, then trigger submit stage
      recordingFlowState.handleDone();
      onDoneAndSubmitStage();
    }
  }, [elapsedSeconds, isRecording, isPaused, onDoneAndSubmitStage, recordingFlowState]);

  // Pass recording state to children via render prop pattern
  return children(recordingFlowState);
}

export default RecordingFlow;