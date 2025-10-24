/**
 * AppContent.jsx
 * --------------
 * The main recording interface component extracted from App.js
 * Renders when a valid session is found and validated
 */

import React, { useReducer, useState, useCallback, useEffect, useRef } from 'react';
import debugLogger from '../utils/debugLogger.js';

// Configuration
import { RECORDING_LIMITS, TIME_FORMAT } from '../config';

// State management
import { appReducer, initialAppState, APP_ACTIONS } from '../reducers/appReducer';

// Extracted components
import RecordingFlow from './RecordingFlow';
import FirebaseErrorBoundary from './FirebaseErrorBoundary';

// Utility functions
import { createSubmissionHandler } from '../utils/submissionHandlers';
import { createNavigationHandlers } from '../utils/navigationHandlers';

// Existing components
import RecordingBar from './RecordingBar';
import CountdownOverlay from './CountdownOverlay';
import ProgressOverlay from './ProgressOverlay';
import RadixStartOverDialog from './RadixStartOverDialog';
import ConfettiScreen from './confettiScreen';
import ErrorScreen from './ErrorScreen';

// Layout components
import MasterLayout from './MasterLayout';

// Screen components (Phase 2: Screen-based architecture)
import WelcomeScreen from './screens/WelcomeScreen';
import PromptReadScreen from './screens/PromptReadScreen';
import ChooseModeScreen from './screens/ChooseModeScreen';
import AudioTest from './screens/AudioTest';
import VideoTest from './screens/VideoTest';
import ReadyToRecordScreen from './screens/ReadyToRecordScreen';
import ActiveRecordingScreen from './screens/ActiveRecordingScreen';
import PausedRecordingScreen from './screens/PausedRecordingScreen';
import ReviewRecordingScreen from './screens/ReviewRecordingScreen';

// Modular CSS imports (split from App.css for maintainability)
import '../styles/variables.css';
import '../styles/layout.css';
import '../styles/buttons.css';
import '../styles/banner.css';
import '../styles/overlays.css';
import '../styles/components.css';
import '../styles/focus-overrides.css';
import '../styles/welcome-screen.css';

function AppContent({ sessionId, sessionData, sessionComponents }) {
  debugLogger.componentMounted('AppContent', {
    sessionId,
    hasSessionData: !!sessionData,
    hasSessionComponents: !!sessionComponents,
    sessionComponents
  });
  
  // Replace multiple useState with useReducer
  const [appState, dispatch] = useReducer(appReducer, initialAppState);
  
  // Radix Dialog state for Start Over confirmation
  const [showStartOverDialog, setShowStartOverDialog] = useState(false);
  
  // Player ready state for loading handling
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Audio permission state tracking
  const [audioPermissionState, setAudioPermissionState] = useState('idle');
  const audioRequestInProgressRef = useRef(false);

  // Video permission state tracking
  const [videoPermissionState, setVideoPermissionState] = useState('idle');
  const videoRequestInProgressRef = useRef(false);

  // Video element ref for connecting mediaStream
  const videoRef = useRef(null);

  // Track recording flow state values for hooks that need them
  const [recordingFlowStateSnapshot, setRecordingFlowStateSnapshot] = useState({
    captureMode: null,
    mediaStream: null,
    handleAudioClick: null,
    handleVideoClick: null
  });

  // Reset player ready state when entering review mode
  useEffect(() => {
    if (appState.submitStage) {
      setIsPlayerReady(false);
    }
  }, [appState.submitStage]);

  // Auto-request microphone permission when AudioTest screen is shown
  useEffect(() => {
    const { captureMode, mediaStream, handleAudioClick } = recordingFlowStateSnapshot;

    // Guard: Only request if not already requesting and conditions met
    if (
      captureMode === 'audio' &&
      !appState.audioTestCompleted &&
      !mediaStream &&
      audioPermissionState === 'idle' &&
      !audioRequestInProgressRef.current &&
      handleAudioClick
    ) {
      audioRequestInProgressRef.current = true;
      setAudioPermissionState('requesting');

      debugLogger.log('info', 'AppContent', 'Auto-requesting microphone permission');

      // Call handleAudioClick and watch for mediaStream changes
      handleAudioClick().catch((error) => {
        debugLogger.log('error', 'AppContent', 'Microphone permission denied', { error });
        setAudioPermissionState('denied');
        audioRequestInProgressRef.current = false;
      });
    }
  }, [recordingFlowStateSnapshot, appState.audioTestCompleted, audioPermissionState]);

  // Watch mediaStream to detect successful permission grant
  useEffect(() => {
    const { captureMode, mediaStream } = recordingFlowStateSnapshot;

    if (captureMode === 'audio' && mediaStream && audioPermissionState === 'requesting') {
      debugLogger.log('info', 'AppContent', 'Microphone permission granted');
      setAudioPermissionState('granted');
      audioRequestInProgressRef.current = false;
    }
  }, [recordingFlowStateSnapshot, audioPermissionState]);

  // Reset permission state when navigating away from audio mode
  useEffect(() => {
    const { captureMode } = recordingFlowStateSnapshot;

    if (captureMode !== 'audio') {
      setAudioPermissionState('idle');
      audioRequestInProgressRef.current = false;
    }
  }, [recordingFlowStateSnapshot]);

  // Auto-request camera permission when VideoTest screen is shown
  useEffect(() => {
    const { captureMode, mediaStream, handleVideoClick } = recordingFlowStateSnapshot;

    // Guard: Only request if not already requesting and conditions met
    if (
      captureMode === 'video' &&
      !appState.videoTestCompleted &&
      !mediaStream &&
      videoPermissionState === 'idle' &&
      !videoRequestInProgressRef.current &&
      handleVideoClick
    ) {
      videoRequestInProgressRef.current = true;
      setVideoPermissionState('requesting');

      debugLogger.log('info', 'AppContent', 'Auto-requesting camera permission');

      // Call handleVideoClick and watch for mediaStream changes
      handleVideoClick().catch((error) => {
        debugLogger.log('error', 'AppContent', 'Camera permission denied', { error });
        setVideoPermissionState('denied');
        videoRequestInProgressRef.current = false;
      });
    }
  }, [recordingFlowStateSnapshot, appState.videoTestCompleted, videoPermissionState]);

  // Watch mediaStream to detect successful video permission grant
  useEffect(() => {
    const { captureMode, mediaStream } = recordingFlowStateSnapshot;

    if (captureMode === 'video' && mediaStream && videoPermissionState === 'requesting') {
      debugLogger.log('info', 'AppContent', 'Camera permission granted');
      setVideoPermissionState('granted');
      videoRequestInProgressRef.current = false;
    }
  }, [recordingFlowStateSnapshot, videoPermissionState]);

  // Reset video permission state when navigating away from video mode
  useEffect(() => {
    const { captureMode } = recordingFlowStateSnapshot;

    if (captureMode !== 'video') {
      setVideoPermissionState('idle');
      videoRequestInProgressRef.current = false;
    }
  }, [recordingFlowStateSnapshot]);

  // Connect mediaStream to video element when available
  useEffect(() => {
    const { mediaStream, captureMode } = recordingFlowStateSnapshot;

    if (videoRef.current && mediaStream && captureMode === 'video') {
      debugLogger.log('info', 'AppContent', 'Connecting mediaStream to video element');
      videoRef.current.srcObject = mediaStream;
    }
  }, [recordingFlowStateSnapshot]);

  // Create auto-transition handler that will be passed to RecordingFlow
  const handleAutoTransition = useCallback(() => {
    debugLogger.log('info', 'AppContent', 'Auto-transitioning to submit stage');
    dispatch({ type: APP_ACTIONS.SET_SUBMIT_STAGE, payload: true });
  }, [dispatch]);

  // Device switching handler - delegates to useRecordingFlow
  const handleSwitchAudioDevice = useCallback(async (deviceId) => {
    try {
      debugLogger.log('info', 'AppContent', 'Switching audio device', { deviceId });

      // Call the hook's switchAudioDevice method
      await recordingFlowStateSnapshot.switchAudioDevice(deviceId);

      debugLogger.log('info', 'AppContent', 'Audio device switched successfully');
    } catch (error) {
      debugLogger.log('error', 'AppContent', 'Failed to switch audio device', { error });

      // Show error to user via existing error system
      dispatch({
        type: APP_ACTIONS.SET_ERROR_MESSAGE,
        payload: `Failed to switch microphone: ${error.message}`
      });
      dispatch({ type: APP_ACTIONS.SET_SHOW_ERROR, payload: true });

      // Old stream is preserved by switchAudioDevice - audio continues
    }
  }, [recordingFlowStateSnapshot, dispatch]);

  debugLogger.log('info', 'AppContent', 'About to render RecordingFlow', {
    sessionId,
    hasSessionData: !!sessionData,
    hasSessionComponents: !!sessionComponents
  });


  return (
    <FirebaseErrorBoundary component="Recording App">
      <RecordingFlow
        onDoneAndSubmitStage={handleAutoTransition}
        sessionId={sessionId}
        sessionData={sessionData}
        sessionComponents={sessionComponents}
      >
      {(recordingFlowState) => {
        debugLogger.log('info', 'AppContent', 'RecordingFlow render prop called', {
          recordingFlowState: {
            captureMode: recordingFlowState.captureMode,
            isRecording: recordingFlowState.isRecording,
            isPaused: recordingFlowState.isPaused,
            hasRecordedBlobUrl: !!recordingFlowState.recordedBlobUrl,
            hasMediaStream: !!recordingFlowState.mediaStream
          }
        });

        const {
          captureMode,
          countdownActive,
          countdownValue,
          isRecording,
          isPaused,
          elapsedSeconds,
          recordedBlobUrl,
          mediaStream,
          handleVideoClick,
          handleAudioClick,
          handleStartRecording,
          handlePause,
          handleResume,
          handleDone,
          setCaptureMode,
          actualMimeType,
          resetRecordingState,
          // Progressive upload removed - using simple upload flow
        } = recordingFlowState;

        // Update state snapshot for useEffect hooks at component level
        // This allows hooks to react to RecordingFlow state changes
        if (
          recordingFlowStateSnapshot.captureMode !== captureMode ||
          recordingFlowStateSnapshot.mediaStream !== mediaStream ||
          recordingFlowStateSnapshot.handleAudioClick !== handleAudioClick ||
          recordingFlowStateSnapshot.handleVideoClick !== handleVideoClick
        ) {
          setRecordingFlowStateSnapshot({
            captureMode,
            mediaStream,
            handleAudioClick,
            handleVideoClick
          });
        }

        // Custom audio click handler that navigates to AudioTest first
        const handleAudioClickWithTest = () => {
          debugLogger.log('info', 'AppContent', 'Audio selected, navigating to AudioTest');
          setCaptureMode('audio');
        };

        // Custom video click handler that navigates to VideoTest first
        const handleVideoClickWithTest = () => {
          debugLogger.log('info', 'AppContent', 'Video selected, navigating to VideoTest');
          setCaptureMode('video');
        };

        // Initialize extracted components and utility functions
        // Creating submission handler (logging disabled for upload analysis focus)

        const handleSubmit = createSubmissionHandler({
          recordedBlobUrl,
          captureMode,
          actualMimeType,
          sessionId,          // NEW: Pass Love Retold sessionId
          sessionComponents,  // NEW: Pass Love Retold sessionComponents
          sessionData,        // UID-FIX-SLICE-A: Pass sessionData for full userId  
          // Progressive upload removed - simple upload after recording
          appState,
          dispatch,
          APP_ACTIONS
        });

        const navigationHandlers = createNavigationHandlers({
          appState,
          dispatch,
          APP_ACTIONS,
          handleDone,
          setCaptureMode,
          setShowStartOverDialog,
          setIsPlayerReady,
          resetRecordingState,
          // RecordingFlow state for back navigation
          isRecording,
          isPaused,
          captureMode,
          mediaStream
        });

        // Format Time utility (using constants for maintainability)
        const formatTime = (sec) => {
          if (!sec || isNaN(sec) || !isFinite(sec)) return TIME_FORMAT.DEFAULT_TIME_DISPLAY;
          const m = Math.floor(sec / TIME_FORMAT.SECONDS_PER_MINUTE);
          const s = Math.floor(sec % TIME_FORMAT.SECONDS_PER_MINUTE);
          return `${m}:${s < TIME_FORMAT.ZERO_PADDING_THRESHOLD ? '0' : ''}${s}`;
        };

        // Screen Router - returns screen object with {timer, content, actions}
        function getCurrentScreen() {
          // Review stage - call as function
          if (appState.submitStage) {
            return ReviewRecordingScreen({
              recordedBlobUrl,
              captureMode,
              actualMimeType,
              isPlayerReady,
              onPlayerReady: () => setIsPlayerReady(true),
              onStartOver: navigationHandlers.handleStartOverClick,
              onUpload: handleSubmit,
              onBack: navigationHandlers.handleBack
            });
          }

          // Prompt read screen - call as function, returns {timer, content, actions}
          if (!appState.hasReadPrompt) {
            return PromptReadScreen({
              sessionData,
              onContinue: () => {
                debugLogger.log('info', 'AppContent', 'Prompt read, proceeding to mode selection');
                dispatch({ type: APP_ACTIONS.SET_HAS_READ_PROMPT, payload: true });
              },
              onBack: navigationHandlers.handleBack
            });
          }

          // Mode selection - call as function
          if (appState.hasReadPrompt && !mediaStream && captureMode == null) {
            return ChooseModeScreen({
              onAudioClick: handleAudioClickWithTest,
              onVideoClick: handleVideoClickWithTest,
              onBack: navigationHandlers.handleBack
            });
          }

          // Audio test screen - shown after audio mode selected
          // Auto-requests permission on mount, shows visualizer when granted
          if (captureMode === 'audio' && !appState.audioTestCompleted) {
            return AudioTest({
              mediaStream: mediaStream,
              permissionState: audioPermissionState,
              onContinue: () => {
                // Only navigation - permission already granted at this point
                debugLogger.log('info', 'AppContent', 'Audio test completed, proceeding to ready screen');
                dispatch({ type: APP_ACTIONS.SET_AUDIO_TEST_COMPLETED, payload: true });
              },
              onRetry: () => {
                // Reset state and retry permission request
                debugLogger.log('info', 'AppContent', 'Retrying microphone permission request');
                audioRequestInProgressRef.current = false;
                setAudioPermissionState('idle');
                // useEffect will trigger on next render
              },
              onSwitchDevice: handleSwitchAudioDevice, // NEW: Device switching handler
              onBack: navigationHandlers.handleBack
            });
          }

          // Video test screen - shown after video mode selected
          // Auto-requests permission on mount, shows video preview when granted
          if (captureMode === 'video' && !appState.videoTestCompleted) {
            return VideoTest({
              mediaStream: mediaStream,
              permissionState: videoPermissionState,
              videoRef: videoRef,
              onContinue: () => {
                // Only navigation - permission already granted at this point
                debugLogger.log('info', 'AppContent', 'Video test completed, proceeding to ready screen');
                dispatch({ type: APP_ACTIONS.SET_VIDEO_TEST_COMPLETED, payload: true });
              },
              onRetry: () => {
                // Reset state and retry permission request
                debugLogger.log('info', 'AppContent', 'Retrying camera permission request');
                videoRequestInProgressRef.current = false;
                setVideoPermissionState('idle');
                // useEffect will trigger on next render
              },
              onBack: navigationHandlers.handleBack
            });
          }

          // Ready to start recording - call as function
          // Only show if appropriate test is completed (audio test for audio, video test for video)
          const isTestCompleted =
            (captureMode === 'audio' && appState.audioTestCompleted) ||
            (captureMode === 'video' && appState.videoTestCompleted);

          if (!isRecording && !isPaused && mediaStream && isTestCompleted) {
            return ReadyToRecordScreen({
              captureMode,
              mediaStream,
              onStartRecording: handleStartRecording,
              sessionData,
              onBack: navigationHandlers.handleBack
            });
          }

          // Recording in progress - call as function
          if (isRecording && !isPaused) {
            return ActiveRecordingScreen({
              captureMode,
              mediaStream,
              onPause: handlePause,
              sessionData,
              onBack: navigationHandlers.handleBack
            });
          }

          // Paused state - call as function
          if (isPaused) {
            return PausedRecordingScreen({
              onResume: handleResume,
              onDone: navigationHandlers.handleDoneAndSubmitStage,
              sessionData,
              onBack: navigationHandlers.handleBack
            });
          }

          return { timer: null, content: null, actions: null };
        }

        // Welcome Screen - First screen users see
        // Background applied to page-container via welcome-state class
        if (appState.showWelcome) {
          const welcomeScreen = WelcomeScreen({
            sessionData,
            onContinue: () => {
              debugLogger.log('info', 'AppContent', 'Welcome screen continue clicked');
              dispatch({ type: APP_ACTIONS.SET_SHOW_WELCOME, payload: false });
            }
          });

          return (
            <MasterLayout
              className="welcome-state"
              timer={welcomeScreen.timer}
              content={welcomeScreen.content}
              actions={welcomeScreen.actions}
              showBanner={true}
            />
          );
        }

        // Error Screen Short-Circuit - takes priority over confetti
        if (appState.showError) {
          debugLogger.log('info', 'AppContent', 'Rendering error screen', {
            errorMessage: appState.errorMessage
          });

          const handleRetry = () => {
            debugLogger.log('info', 'AppContent', 'Error retry clicked');
            dispatch({ type: APP_ACTIONS.CLEAR_ERROR });
            // Stay in submit stage so user can retry upload
          };

          const handleCancel = () => {
            debugLogger.log('info', 'AppContent', 'Error cancel clicked - starting over');
            dispatch({ type: APP_ACTIONS.CLEAR_ERROR });
            navigationHandlers.handleStartOverConfirm();
          };

          return (
            <ErrorScreen
              errorMessage={appState.errorMessage}
              onRetry={handleRetry}
              onCancel={handleCancel}
            />
          );
        }

        // Confetti Short-Circuit (preserves exact logic from original App.js:106-108)
        if (appState.showConfetti) {
          debugLogger.log('info', 'AppContent', 'Rendering confetti screen', { docId: appState.docId });
          return <ConfettiScreen docId={appState.docId} />;
        }

        // Main UI - uses MasterLayout for consistent structure
        debugLogger.log('info', 'AppContent', 'Rendering main recording UI', {
          submitStage: appState.submitStage,
          uploadInProgress: appState.uploadInProgress,
          captureMode,
          isRecording,
          isPaused,
          hasRecordedBlobUrl: !!recordedBlobUrl
        });

        // Get current screen object {timer, content, actions}
        const screen = getCurrentScreen();

        // Calculate timer content - screen timer takes priority, fallback to RecordingBar
        const timerContent = screen.timer || (
          (isRecording || isPaused) ? (
            <div className="recording-bar-container">
              <RecordingBar
                elapsedSeconds={elapsedSeconds}
                totalSeconds={RECORDING_LIMITS.MAX_DURATION_SECONDS}
                isRecording={isRecording}
                isPaused={isPaused}
                formatTime={formatTime}
              />
            </div>
          ) : null
        );

        return (
          <MasterLayout
            timer={timerContent}
            content={screen.content}
            actions={screen.actions}
            showBanner={true}
            bannerText={screen.bannerText}
            onBack={screen.onBack}
            showBackButton={screen.showBackButton}
            iconA3={screen.iconA3}
          >
            {/* Overlays and dialogs */}
            {countdownActive && (
              <CountdownOverlay countdownValue={countdownValue} />
            )}

            <RadixStartOverDialog
              open={showStartOverDialog}
              onOpenChange={setShowStartOverDialog}
              onConfirm={navigationHandlers.handleStartOverConfirm}
              onCancel={() => setShowStartOverDialog(false)}
            />

            {appState.uploadInProgress && (
              <ProgressOverlay fraction={appState.uploadFraction} />
            )}
          </MasterLayout>
        );
      }}
    </RecordingFlow>
    </FirebaseErrorBoundary>
  );
}

export default AppContent;