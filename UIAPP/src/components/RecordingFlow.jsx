/**
 * RecordingFlow.jsx
 * -----------------
 * Manages the recording state and auto-transition logic.
 * Extracts recording flow concerns from App.js while preserving exact behavior.
 */

import { useEffect } from 'react';
import { RECORDING_LIMITS } from '../config';
import useRecordingFlow from '../hooks/useRecordingFlow';
import debugLogger from '../utils/debugLogger.js';

function RecordingFlow({ 
  onDoneAndSubmitStage,
  sessionId,
  sessionData,
  sessionComponents,
  children 
}) {
  debugLogger.componentMounted('RecordingFlow', {
    sessionId,
    hasSessionData: !!sessionData,
    hasSessionComponents: !!sessionComponents,
    hasOnDoneAndSubmitStage: !!onDoneAndSubmitStage
  });
  // Get recording flow state and handlers
  debugLogger.log('info', 'RecordingFlow', 'Calling useRecordingFlow hook', {
    sessionId,
    hasSessionData: !!sessionData,
    hasSessionComponents: !!sessionComponents
  });
  
  const recordingFlowState = useRecordingFlow({
    sessionId,
    sessionData,
    sessionComponents,
    onDoneAndSubmitStage
  });
  
  debugLogger.log('info', 'RecordingFlow', 'useRecordingFlow hook returned', {
    hasRecordingFlowState: !!recordingFlowState,
    isRecording: recordingFlowState?.isRecording,
    captureMode: recordingFlowState?.captureMode
  });
  
  const { elapsedSeconds, isRecording, isPaused } = recordingFlowState;

  // Auto-transition at max duration (preserves exact logic from App.js:97-101)
  useEffect(() => {
    if (elapsedSeconds >= RECORDING_LIMITS.MAX_DURATION_SECONDS && isRecording && !isPaused) {
      debugLogger.log('info', 'RecordingFlow', 'Auto-transitioning at max duration', {
        elapsedSeconds,
        maxDuration: RECORDING_LIMITS.MAX_DURATION_SECONDS
      });
      // Stop recording first, then trigger submit stage
      recordingFlowState.handleDone();
      onDoneAndSubmitStage();
    }
  }, [elapsedSeconds, isRecording, isPaused, onDoneAndSubmitStage, recordingFlowState]);

  // Pass recording state to children via render prop pattern
  debugLogger.log('info', 'RecordingFlow', 'Calling children render prop', {
    hasRecordingFlowState: !!recordingFlowState
  });
  return children(recordingFlowState);
}

export default RecordingFlow;