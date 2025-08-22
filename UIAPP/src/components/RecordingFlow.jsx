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

  // SLICE-D: Warning notification at 14 minutes
  useEffect(() => {
    if (elapsedSeconds >= RECORDING_LIMITS.WARNING_TIME && isRecording && !isPaused) {
      debugLogger.log('info', 'RecordingFlow', 'Showing 14-minute warning notification', {
        elapsedSeconds,
        warningTime: RECORDING_LIMITS.WARNING_TIME
      });
      
      // Show warning notification only once
      if (elapsedSeconds === RECORDING_LIMITS.WARNING_TIME) {
        alert('Recording will automatically stop in 1 minute (15-minute limit).');
      }
    }
  }, [elapsedSeconds, isRecording, isPaused]);

  // SLICE-D: Auto-transition at 15-minute max duration (enhanced from original App.js:97-101)
  useEffect(() => {
    if (elapsedSeconds >= RECORDING_LIMITS.MAX_DURATION_SECONDS && isRecording && !isPaused) {
      debugLogger.log('info', 'RecordingFlow', 'Auto-transitioning at 15-minute limit', {
        elapsedSeconds,
        maxDuration: RECORDING_LIMITS.MAX_DURATION_SECONDS
      });
      
      // Show user notification about auto-stop
      alert('Recording has reached the 15-minute limit and will now stop automatically.');
      
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