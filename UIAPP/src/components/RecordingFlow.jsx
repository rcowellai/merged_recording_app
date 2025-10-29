/**
 * RecordingFlow.jsx
 * -----------------
 * Manages the recording state and auto-transition logic.
 * NOTE: Timer state moved to TimerContext - this component now receives callbacks.
 * FIXED: Added onStateChange callback to notify parent of state changes (prevents setState during render)
 */

import { useEffect } from 'react';
import useRecordingFlow from '../hooks/useRecordingFlow';
import debugLogger from '../utils/debugLogger.js';

function RecordingFlow({
  onDoneAndSubmitStage,
  onTimerWarning,
  onTimerMaxDuration,
  sessionId,
  sessionData,
  sessionComponents,
  onStateChange,
  children
}) {
  debugLogger.componentMounted('RecordingFlow', {
    sessionId,
    hasSessionData: !!sessionData,
    hasSessionComponents: !!sessionComponents,
    hasOnDoneAndSubmitStage: !!onDoneAndSubmitStage
  });

  const recordingFlowState = useRecordingFlow({
    sessionId,
    sessionData,
    sessionComponents,
    onDoneAndSubmitStage
  });

  // Notify parent component of state changes via callback
  // This allows AppContent to update its state in response to RecordingFlow changes
  // without causing setState-during-render warnings
  useEffect(() => {
    if (onStateChange && recordingFlowState) {
      onStateChange(recordingFlowState);
    }
  }, [
    recordingFlowState?.captureMode,
    recordingFlowState?.mediaStream,
    recordingFlowState?.handleAudioClick,
    recordingFlowState?.handleVideoClick,
    onStateChange
  ]);

  debugLogger.log('info', 'RecordingFlow', 'useRecordingFlow hook returned', {
    hasRecordingFlowState: !!recordingFlowState,
    isRecording: recordingFlowState?.isRecording,
    captureMode: recordingFlowState?.captureMode
  });

  // Pass recording state to children via render prop pattern
  debugLogger.log('info', 'RecordingFlow', 'Calling children render prop', {
    hasRecordingFlowState: !!recordingFlowState
  });

  return children(recordingFlowState);
}

export default RecordingFlow;