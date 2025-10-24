/**
 * navigationHandlers.js
 * ----------------------
 * Utility functions for handling navigation and overlay states.
 * Moved from components/NavigationController.jsx for better architecture.
 * Updated to use modern modal system.
 */

// Modal imports removed - now using Radix Dialog directly in App.js

/**
 * Creates navigation handler functions
 * @param {Object} params - Navigation parameters
 * @returns {Object} Object containing navigation handlers
 */
export function createNavigationHandlers({
  appState,
  dispatch,
  APP_ACTIONS,
  handleDone,
  setCaptureMode,
  setShowStartOverDialog,
  setIsPlayerReady,
  resetRecordingState,
  // RecordingFlow state needed for back navigation
  isRecording,
  isPaused,
  captureMode,
  mediaStream
}) {
  
  // "Start Over" Flow - Now using Radix Dialog
  const handleStartOverClick = () => {
    console.log('🚀 Start Over button clicked');
    console.log('📱 Showing Radix dialog...');
    setShowStartOverDialog(true);
  };

  // Handle the actual start over confirmation
  const handleStartOverConfirm = () => {
    console.log('✨ Start over confirmed');

    // Use comprehensive reset function from useRecordingFlow
    resetRecordingState();

    // Reset app state (UI-related state)
    dispatch({ type: APP_ACTIONS.SET_HAS_READ_PROMPT, payload: false });
    dispatch({ type: APP_ACTIONS.SET_AUDIO_TEST_COMPLETED, payload: false });
    dispatch({ type: APP_ACTIONS.SET_VIDEO_TEST_COMPLETED, payload: false });
    dispatch({ type: APP_ACTIONS.SET_SUBMIT_STAGE, payload: false });
    dispatch({ type: APP_ACTIONS.SET_SHOW_CONFETTI, payload: false });
    dispatch({ type: APP_ACTIONS.SET_DOC_ID, payload: null });
    dispatch({ type: APP_ACTIONS.SET_UPLOAD_IN_PROGRESS, payload: false });
    dispatch({ type: APP_ACTIONS.SET_UPLOAD_FRACTION, payload: 0 });

    // Reset player state
    setIsPlayerReady(false);
  };

  // Keep legacy handlers for backward compatibility during transition
  const handleStartOverYes = () => {
    // Use comprehensive reset function from useRecordingFlow
    resetRecordingState();

    // Reset app state (UI-related state)
    dispatch({ type: APP_ACTIONS.SET_SHOW_START_OVER_CONFIRM, payload: false });
    dispatch({ type: APP_ACTIONS.SET_HAS_READ_PROMPT, payload: false });
    dispatch({ type: APP_ACTIONS.SET_AUDIO_TEST_COMPLETED, payload: false });
    dispatch({ type: APP_ACTIONS.SET_VIDEO_TEST_COMPLETED, payload: false });
    dispatch({ type: APP_ACTIONS.SET_SUBMIT_STAGE, payload: false });
    dispatch({ type: APP_ACTIONS.SET_SHOW_CONFETTI, payload: false });
    dispatch({ type: APP_ACTIONS.SET_DOC_ID, payload: null });
    dispatch({ type: APP_ACTIONS.SET_UPLOAD_IN_PROGRESS, payload: false });
    dispatch({ type: APP_ACTIONS.SET_UPLOAD_FRACTION, payload: 0 });
  };

  const handleStartOverNo = () => {
    dispatch({ type: APP_ACTIONS.SET_SHOW_START_OVER_CONFIRM, payload: false });
  };

  // "Done" => Move to Submit Stage (inline review mode)
  const handleDoneAndSubmitStage = () => {
    handleDone();
    dispatch({ type: APP_ACTIONS.SET_SUBMIT_STAGE, payload: true });
  };

  // "Back" => Navigate to previous screen in the flow
  // Priority-ordered to match screen routing logic in getCurrentScreen()
  const handleBack = () => {
    console.log('⬅️ Back button clicked', {
      submitStage: appState.submitStage,
      isRecording,
      isPaused,
      captureMode,
      hasMediaStream: !!mediaStream,
      hasReadPrompt: appState.hasReadPrompt,
      audioTestCompleted: appState.audioTestCompleted,
      showWelcome: appState.showWelcome
    });

    // PRIORITY 1: ReviewRecordingScreen → PausedRecordingScreen
    // Condition: submitStage === true
    if (appState.submitStage) {
      console.log('📍 From ReviewRecordingScreen → PausedRecordingScreen');
      dispatch({ type: APP_ACTIONS.SET_SUBMIT_STAGE, payload: false });
      return;
    }

    // PRIORITY 2: PausedRecordingScreen → ReadyToRecordScreen
    // Condition: isPaused === true
    if (isPaused) {
      console.log('📍 From PausedRecordingScreen → ReadyToRecordScreen');
      resetRecordingState(); // Resets isPaused/isRecording but keeps mediaStream
      return;
    }

    // PRIORITY 3: ActiveRecordingScreen → ReadyToRecordScreen
    // Condition: isRecording && !isPaused
    if (isRecording && !isPaused) {
      console.log('📍 From ActiveRecordingScreen → ReadyToRecordScreen');
      resetRecordingState(); // Resets recording state but keeps mediaStream
      return;
    }

    // PRIORITY 4: ReadyToRecordScreen → AudioTest OR VideoTest OR ChooseModeScreen
    // Condition: !isRecording && !isPaused && mediaStream
    if (!isRecording && !isPaused && mediaStream) {
      // If came from AudioTest (audio mode and test was completed)
      if (captureMode === 'audio' && appState.audioTestCompleted) {
        console.log('📍 From ReadyToRecordScreen → AudioTest');
        dispatch({ type: APP_ACTIONS.SET_AUDIO_TEST_COMPLETED, payload: false });
        return;
      }
      // If came from VideoTest (video mode and test was completed)
      if (captureMode === 'video' && appState.videoTestCompleted) {
        console.log('📍 From ReadyToRecordScreen → VideoTest');
        dispatch({ type: APP_ACTIONS.SET_VIDEO_TEST_COMPLETED, payload: false });
        return;
      }
      // If came from ChooseModeScreen (no test completed)
      console.log('📍 From ReadyToRecordScreen → ChooseModeScreen');
      setCaptureMode(null); // Clears captureMode, RecordingFlow will clean mediaStream
      return;
    }

    // PRIORITY 5: AudioTest OR VideoTest → ChooseModeScreen
    // Condition: (captureMode === 'audio' && !audioTestCompleted) OR (captureMode === 'video' && !videoTestCompleted)
    if (captureMode === 'audio' && !appState.audioTestCompleted) {
      console.log('📍 From AudioTest → ChooseModeScreen');
      setCaptureMode(null); // Clears captureMode, shows ChooseModeScreen
      return;
    }
    if (captureMode === 'video' && !appState.videoTestCompleted) {
      console.log('📍 From VideoTest → ChooseModeScreen');
      setCaptureMode(null); // Clears captureMode, shows ChooseModeScreen
      return;
    }

    // PRIORITY 6: ChooseModeScreen → PromptReadScreen
    // Condition: hasReadPrompt && !mediaStream && captureMode == null
    if (appState.hasReadPrompt && !mediaStream && captureMode == null) {
      console.log('📍 From ChooseModeScreen → PromptReadScreen');
      dispatch({ type: APP_ACTIONS.SET_HAS_READ_PROMPT, payload: false });
      return;
    }

    // PRIORITY 7: PromptReadScreen → WelcomeScreen
    // Condition: !hasReadPrompt && !showWelcome
    if (!appState.hasReadPrompt && !appState.showWelcome) {
      console.log('📍 From PromptReadScreen → WelcomeScreen');
      dispatch({ type: APP_ACTIONS.SET_SHOW_WELCOME, payload: true });
      return;
    }

    // Fallback - should not reach here
    console.warn('⚠️ Back button: No matching navigation condition found');
  };

  return {
    handleStartOverClick,
    handleStartOverConfirm,
    handleStartOverYes,
    handleStartOverNo,
    handleDoneAndSubmitStage,
    handleBack
  };
}