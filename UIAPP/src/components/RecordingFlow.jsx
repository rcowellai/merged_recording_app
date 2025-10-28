/**
 * RecordingFlow.jsx
 * -----------------
 * Manages the recording state and auto-transition logic.
 * NOTE: Timer state moved to TimerContext - this component now receives callbacks.
 */

import useRecordingFlow from '../hooks/useRecordingFlow';
import debugLogger from '../utils/debugLogger.js';

function RecordingFlow({
  onDoneAndSubmitStage,
  onTimerWarning,
  onTimerMaxDuration,
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

  // Pass recording state to children via render prop pattern
  debugLogger.log('info', 'RecordingFlow', 'Calling children render prop', {
    hasRecordingFlowState: !!recordingFlowState
  });

  return children(recordingFlowState);
}

export default RecordingFlow;