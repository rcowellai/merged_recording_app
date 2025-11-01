/**
 * AppContent.jsx
 * --------------
 * Main Recording Interface Orchestrator
 *
 * PURPOSE:
 * Primary UI container that manages the complete recording workflow state machine.
 * Coordinates all recording screens, handles uploads, errors, and success states.
 *
 * RESPONSIBILITIES:
 * - State management via useReducer (appReducer) for recording flow
 * - Screen routing: welcome → choose mode → test → record → review → upload
 * - Upload coordination with real-time progress tracking
 * - Error handling with retry logic and user-friendly error screens
 * - Success state with confetti celebration
 * - Dialog management (start over, device settings)
 * - Firebase error boundary integration for graceful failure handling
 *
 * USED BY:
 * - SessionValidator.jsx (renders AppContent after successful session validation)
 *
 * FLOW:
 * App.js → SessionValidator → AppContent (main recording UI)
 *
 * KEY FEATURES:
 * - 10+ screen components orchestrated (WelcomeScreen, ChooseModeScreen, AudioTest,
 *   VideoTest, ReadyToRecordScreen, ActiveRecordingScreen, PausedRecordingScreen,
 *   ReviewRecordingScreen, etc.)
 * - Conditional overlays: ProgressOverlay (upload), ErrorScreen (failures),
 *   ConfettiScreen (success)
 * - Vaul drawers: VaulStartOverDrawer (confirmation), VaulDeviceSettingsDrawer (settings)
 * - MasterLayout integration for consistent UI structure
 */

import React, { useReducer, useState, useCallback, useEffect, useRef } from 'react';
import debugLogger from '../utils/debugLogger.js';

// Configuration
import { RECORDING_LIMITS, TIME_FORMAT } from '../config';

// State management
import { appReducer, initialAppState, APP_ACTIONS } from '../reducers/appReducer';

// Permission utilities
import { hasMediaPermission, hasVideoPermissions } from '../utils/permissionUtils';

// Extracted components
import RecordingFlow from './RecordingFlow';
import FirebaseErrorBoundary from './FirebaseErrorBoundary';

// Timer context
import { TimerProvider } from '../contexts/TimerContext';

// Utility functions
import { createSubmissionHandler } from '../utils/submissionHandlers';
import { createNavigationHandlers } from '../utils/navigationHandlers';

// Existing components
import RecordingBar from './RecordingBar';
import CountdownOverlay from './CountdownOverlay';
import ProgressOverlay from './ProgressOverlay';
import VaulStartOverDrawer from './VaulStartOverDrawer';
import VaulDeviceSettingsDrawer from './VaulDeviceSettingsDrawer';
import ConfettiScreen from './confettiScreen';
import ErrorScreen from './ErrorScreen';

// Layout components
import MasterLayout from './MasterLayout';

// Screen components (Phase 2: Screen-based architecture)
import WelcomeScreen from './screens/WelcomeScreen';
import PromptReadScreen from './screens/PromptReadScreen';
import ChooseModeScreen from './screens/ChooseModeScreen';
import AudioAccess from './screens/AudioAccess';
import VideoAccess from './screens/VideoAccess';
import AudioTest from './screens/AudioTest';
import VideoTest from './screens/VideoTest';
import ReadyToRecordScreen from './screens/ReadyToRecordScreen';
import ActiveRecordingScreen from './screens/ActiveRecordingScreen';
import PausedRecordingScreen from './screens/PausedRecordingScreen';
import ReviewRecordingScreen from './screens/ReviewRecordingScreen';

// Token provider for inline styling
import { useTokens } from '../theme/TokenProvider';

/**
 * formatBannerContent
 * -------------------
 * Formats banner content based on type for responsive display.
 *
 * @param {*} content - Banner content (string, React node, or null)
 * @param {Object} tokens - Design tokens from TokenProvider (unused now, kept for API compatibility)
 * @returns {React.Node|null} Formatted content for banner section
 *
 * Behavior:
 * - String: Returns string directly - styling controlled by container (A2 or B1B)
 * - React node: Renders as-is (e.g., RecordingBar component)
 * - null/undefined: Returns null (shows default logo)
 *
 * Note: Container-first styling approach allows responsive typography:
 * - Mobile (A2): Inherits A2 container styles
 * - Tablet/Desktop (B1B): Inherits B1B container styles
 */
function formatBannerContent(content, tokens) {
  if (!content) return null;

  // String content: Return as-is, let container control styling
  if (typeof content === 'string') {
    return content;
  }

  // React component: Render directly (e.g., RecordingBar)
  return content;
}

function AppContent({ sessionId, sessionData, sessionComponents }) {
  const { tokens } = useTokens();

  debugLogger.componentMounted('AppContent', {
    sessionId,
    hasSessionData: !!sessionData,
    hasSessionComponents: !!sessionComponents,
    sessionComponents
  });

  // Replace multiple useState with useReducer
  const [appState, dispatch] = useReducer(appReducer, initialAppState);

  // Vaul Drawer states
  const [showStartOverDialog, setShowStartOverDialog] = useState(false);
  const [showDeviceSettingsDrawer, setShowDeviceSettingsDrawer] = useState(false);
  const [deviceSettingsProps, setDeviceSettingsProps] = useState(null);

  // Player ready state for loading handling
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Permission screen state (for AudioAccess/VideoAccess)
  const [audioPermissionError, setAudioPermissionError] = useState(null);
  const [audioPermissionRequesting, setAudioPermissionRequesting] = useState(false);
  const [videoPermissionError, setVideoPermissionError] = useState(null);
  const [videoPermissionRequesting, setVideoPermissionRequesting] = useState(false);

  // Video element ref for connecting mediaStream
  const videoRef = useRef(null);

  // Track recording flow state values for hooks that need them
  const [recordingFlowStateSnapshot, setRecordingFlowStateSnapshot] = useState({
    captureMode: null,
    mediaStream: null,
    handleAudioClick: null,
    handleVideoClick: null,
    recordedBlobUrl: null,
    actualMimeType: null
  });

  // Ref to store current recording flow state for timer callbacks
  const recordingFlowStateRef = useRef(null);

  // Reset player ready state when entering review mode
  useEffect(() => {
    if (appState.submitStage) {
      setIsPlayerReady(false);
    }
  }, [appState.submitStage]);

  // Connect mediaStream to video element when available
  // Also triggers when navigating back to VideoTest to restart video playback
  useEffect(() => {
    const { mediaStream, captureMode } = recordingFlowStateSnapshot;

    if (videoRef.current && mediaStream && captureMode === 'video') {
      debugLogger.log('info', 'AppContent', 'Connecting mediaStream to video element');
      videoRef.current.srcObject = mediaStream;

      // Ensure playback starts - handles returning to VideoTest from ReadyToRecordScreen
      // Fixes bug: Black square appears when navigating back because video is paused
      videoRef.current.play().catch(err => {
        console.warn('Video play failed:', err);
      });
    }
  }, [recordingFlowStateSnapshot, appState.videoTestCompleted]);

  // Create auto-transition handler that will be passed to RecordingFlow
  const handleAutoTransition = useCallback(() => {
    debugLogger.log('info', 'AppContent', 'Auto-transitioning to submit stage');
    dispatch({ type: APP_ACTIONS.SET_SUBMIT_STAGE, payload: true });
  }, [dispatch]);

  // Timer warning callback (14 minutes)
  const handleTimerWarning = useCallback(() => {
    debugLogger.log('info', 'AppContent', 'Showing 14-minute warning notification');
    alert('Recording will automatically stop in 1 minute (15-minute limit).');
  }, []);

  // Timer max duration callback (15 minutes)
  const handleTimerMaxDuration = useCallback(() => {
    debugLogger.log('info', 'AppContent', 'Auto-transitioning at 15-minute limit');
    alert('Recording has reached the 15-minute limit and will now stop automatically.');
    if (recordingFlowStateRef.current?.handleDone) {
      recordingFlowStateRef.current.handleDone();
    }
    handleAutoTransition();
  }, [handleAutoTransition]);


  // Device switching handler - delegates to useRecordingFlow
  const handleSwitchAudioDevice = useCallback(async (deviceId) => {
    try {
      // Call the hook's switchAudioDevice method from ref (not snapshot)
      if (!recordingFlowStateRef.current?.switchAudioDevice) {
        throw new Error('switchAudioDevice is not available in recording flow state');
      }

      await recordingFlowStateRef.current.switchAudioDevice(deviceId);

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
      throw error; // Re-throw so drawer knows about the error
    }
  }, [dispatch]);

  // Video device switching handler - delegates to useRecordingFlow
  const handleSwitchVideoDevice = useCallback(async (deviceId) => {
    try {
      // Call the hook's switchVideoDevice method from ref (not snapshot)
      if (!recordingFlowStateRef.current?.switchVideoDevice) {
        throw new Error('switchVideoDevice is not available in recording flow state');
      }

      await recordingFlowStateRef.current.switchVideoDevice(deviceId);

      debugLogger.log('info', 'AppContent', 'Video device switched successfully');
    } catch (error) {
      debugLogger.log('error', 'AppContent', 'Failed to switch video device', { error });

      // Show error to user via existing error system
      dispatch({
        type: APP_ACTIONS.SET_ERROR_MESSAGE,
        payload: `Failed to switch camera: ${error.message}`
      });
      dispatch({ type: APP_ACTIONS.SET_SHOW_ERROR, payload: true });

      // Old stream is preserved by switchVideoDevice - video/audio continues
      throw error; // Re-throw so drawer knows about the error
    }
  }, [dispatch]);

  // Device settings drawer handler - stores props and opens drawer
  const handleOpenDeviceSettings = useCallback((props) => {
    debugLogger.log('info', 'AppContent', 'Opening device settings drawer', { deviceType: props?.deviceType });
    setDeviceSettingsProps(props);
    setShowDeviceSettingsDrawer(true);
  }, []);


  // RecordingFlow state change handler
  // FIXED: Moved state synchronization from render to callback to prevent setState-during-render warning
  const handleRecordingFlowStateChange = useCallback((newState) => {
    const { captureMode, mediaStream, handleAudioClick, handleVideoClick, recordedBlobUrl, actualMimeType } = newState;

    // Only update if values actually changed (prevents unnecessary re-renders)
    setRecordingFlowStateSnapshot(prev => {
      const hasChanged =
        prev.captureMode !== captureMode ||
        prev.mediaStream !== mediaStream ||
        prev.handleAudioClick !== handleAudioClick ||
        prev.handleVideoClick !== handleVideoClick ||
        prev.recordedBlobUrl !== recordedBlobUrl ||
        prev.actualMimeType !== actualMimeType;

      if (!hasChanged) {
        return prev; // No change, prevent re-render
      }

      return {
        captureMode,
        mediaStream,
        handleAudioClick,
        handleVideoClick,
        recordedBlobUrl,
        actualMimeType
      };
    });
  }, []);

  debugLogger.log('info', 'AppContent', 'About to render RecordingFlow', {
    sessionId,
    hasSessionData: !!sessionData,
    hasSessionComponents: !!sessionComponents
  });


  return (
    <FirebaseErrorBoundary component="Recording App">
      <RecordingFlow
        onDoneAndSubmitStage={handleAutoTransition}
        onTimerWarning={handleTimerWarning}
        onTimerMaxDuration={handleTimerMaxDuration}
        sessionId={sessionId}
        sessionData={sessionData}
        sessionComponents={sessionComponents}
        onStateChange={handleRecordingFlowStateChange}
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

        // Store current state in ref for timer callbacks
        recordingFlowStateRef.current = recordingFlowState;

        const {
          captureMode,
          countdownActive,
          countdownValue,
          isRecording,
          isPaused,
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

        // FIXED: Removed setState block that was causing "setState during render" warning
        // State synchronization now happens via onStateChange callback in RecordingFlow's useEffect
        // See handleRecordingFlowStateChange above (line 306)

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
              onAudioClick: async () => {
                debugLogger.log('info', 'AppContent', 'Audio mode selected, checking permission');

                // Check if microphone permission already granted
                const hasPermission = await hasMediaPermission('microphone');

                if (hasPermission) {
                  // Permission already granted - set flag and skip AudioAccess screen
                  console.log('[AppContent] Microphone permission already granted, setting flag');
                  dispatch({ type: APP_ACTIONS.SET_AUDIO_PERMISSION_GRANTED, payload: true });
                } else {
                  console.log('[AppContent] Microphone permission not granted');
                  dispatch({ type: APP_ACTIONS.SET_AUDIO_PERMISSION_GRANTED, payload: false });
                }

                // ALWAYS set captureMode to trigger flow
                setCaptureMode('audio');
              },
              onVideoClick: async () => {
                debugLogger.log('info', 'AppContent', 'Video mode selected, checking permissions');

                // Check if camera AND microphone permissions already granted
                const hasPermissions = await hasVideoPermissions();

                if (hasPermissions) {
                  // Permissions already granted - set flag and skip VideoAccess screen
                  console.log('[AppContent] Camera permissions already granted, setting flag');
                  dispatch({ type: APP_ACTIONS.SET_VIDEO_PERMISSION_GRANTED, payload: true });
                } else {
                  console.log('[AppContent] Camera permissions not granted');
                  dispatch({ type: APP_ACTIONS.SET_VIDEO_PERMISSION_GRANTED, payload: false });
                }

                // ALWAYS set captureMode to trigger flow
                setCaptureMode('video');
              },
              onBack: navigationHandlers.handleBack
            });
          }

          // AudioAccess screen - shown when audio mode selected but permission not yet granted
          // Only shows if audioPermissionGranted is false
          if (captureMode === 'audio' && !appState.audioPermissionGranted) {
            return AudioAccess({
              onPermissionGranted: async (stream) => {
                debugLogger.log('info', 'AppContent', 'Microphone permission granted on AudioAccess');

                setAudioPermissionRequesting(true);
                setAudioPermissionError(null);

                // Stop the stream from AudioAccess - we'll request a fresh one
                stream.getTracks().forEach(track => track.stop());

                // Mark permission as granted
                dispatch({ type: APP_ACTIONS.SET_AUDIO_PERMISSION_GRANTED, payload: true });

                // Request stream via handleAudioClick to properly integrate with RecordingFlow
                try {
                  await handleAudioClick();
                  setAudioPermissionRequesting(false);
                } catch (error) {
                  debugLogger.log('error', 'AppContent', 'Failed to get audio stream after permission granted', { error });
                  // Reset permission flag so user goes back to AudioAccess
                  dispatch({ type: APP_ACTIONS.SET_AUDIO_PERMISSION_GRANTED, payload: false });
                  setAudioPermissionRequesting(false);
                  setAudioPermissionError('Failed to access microphone. Please try again.');
                }

                // User will now see AudioTest screen on next render with mediaStream
              },
              onPermissionDenied: (error, message) => {
                debugLogger.log('error', 'AppContent', 'Microphone permission denied on AudioAccess', { error });

                // Set error message for inline display
                setAudioPermissionError(message);
                setAudioPermissionRequesting(false);
              },
              onBack: navigationHandlers.handleBack,
              errorMessage: audioPermissionError,
              isRequesting: audioPermissionRequesting
            });
          }

          // AudioTest screen - shown after audio mode selected AND permission granted
          // Shows device test UI with visualizer
          if (captureMode === 'audio' && appState.audioPermissionGranted && !appState.audioTestCompleted) {
            // If no stream yet, request it now (for detected-but-not-requested case)
            if (!mediaStream) {
              // Call handleAudioClick to request stream
              handleAudioClick().catch((error) => {
                debugLogger.log('error', 'AppContent', 'Failed to get audio stream on AudioTest', { error });
                // Reset permission flag so user goes back to AudioAccess
                dispatch({ type: APP_ACTIONS.SET_AUDIO_PERMISSION_GRANTED, payload: false });
              });
            }

            return AudioTest({
              mediaStream: mediaStream,
              permissionState: mediaStream ? 'granted' : 'requesting',
              onContinue: () => {
                debugLogger.log('info', 'AppContent', 'Audio test completed, proceeding to ready screen');
                dispatch({ type: APP_ACTIONS.SET_AUDIO_TEST_COMPLETED, payload: true });
              },
              onRetry: () => {
                // If retry needed, go back to AudioAccess
                debugLogger.log('info', 'AppContent', 'Retrying audio permission from AudioTest');
                dispatch({ type: APP_ACTIONS.SET_AUDIO_PERMISSION_GRANTED, payload: false });
              },
              onSwitchDevice: handleSwitchAudioDevice,
              onOpenSettings: handleOpenDeviceSettings,
              onBack: navigationHandlers.handleBack
            });
          }

          // VideoAccess screen - shown when video mode selected but permission not yet granted
          // Only shows if videoPermissionGranted is false
          if (captureMode === 'video' && !appState.videoPermissionGranted) {
            return VideoAccess({
              onPermissionGranted: async (stream) => {
                debugLogger.log('info', 'AppContent', 'Camera permission granted on VideoAccess');

                setVideoPermissionRequesting(true);
                setVideoPermissionError(null);

                // Stop the stream from VideoAccess - we'll request a fresh one
                stream.getTracks().forEach(track => track.stop());

                // Mark permission as granted
                dispatch({ type: APP_ACTIONS.SET_VIDEO_PERMISSION_GRANTED, payload: true });

                // Request stream via handleVideoClick to properly integrate with RecordingFlow
                try {
                  await handleVideoClick();
                  setVideoPermissionRequesting(false);
                } catch (error) {
                  debugLogger.log('error', 'AppContent', 'Failed to get video stream after permission granted', { error });
                  // Reset permission flag so user goes back to VideoAccess
                  dispatch({ type: APP_ACTIONS.SET_VIDEO_PERMISSION_GRANTED, payload: false });
                  setVideoPermissionRequesting(false);
                  setVideoPermissionError('Failed to access camera. Please try again.');
                }

                // User will now see VideoTest screen on next render with mediaStream
              },
              onPermissionDenied: (error, message) => {
                debugLogger.log('error', 'AppContent', 'Camera permission denied on VideoAccess', { error });

                // Set error message for inline display
                setVideoPermissionError(message);
                setVideoPermissionRequesting(false);
              },
              onBack: navigationHandlers.handleBack,
              errorMessage: videoPermissionError,
              isRequesting: videoPermissionRequesting
            });
          }

          // VideoTest screen - shown after video mode selected AND permission granted
          // Shows device test UI with video preview
          if (captureMode === 'video' && appState.videoPermissionGranted && !appState.videoTestCompleted) {
            // If no stream yet, request it now (for detected-but-not-requested case)
            if (!mediaStream) {
              // Call handleVideoClick to request stream
              handleVideoClick().catch((error) => {
                debugLogger.log('error', 'AppContent', 'Failed to get video stream on VideoTest', { error });
                // Reset permission flag so user goes back to VideoAccess
                dispatch({ type: APP_ACTIONS.SET_VIDEO_PERMISSION_GRANTED, payload: false });
              });
            }

            return VideoTest({
              mediaStream: mediaStream,
              permissionState: mediaStream ? 'granted' : 'requesting',
              videoRef: videoRef,
              onContinue: () => {
                debugLogger.log('info', 'AppContent', 'Video test completed, proceeding to ready screen');
                dispatch({ type: APP_ACTIONS.SET_VIDEO_TEST_COMPLETED, payload: true });
              },
              onRetry: () => {
                // If retry needed, go back to VideoAccess
                debugLogger.log('info', 'AppContent', 'Retrying camera permission from VideoTest');
                dispatch({ type: APP_ACTIONS.SET_VIDEO_PERMISSION_GRANTED, payload: false });
              },
              onSwitchDevice: handleSwitchVideoDevice,
              onOpenSettings: handleOpenDeviceSettings,
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
              onBack: navigationHandlers.handleBack,
              countdownActive
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
              bannerContent={welcomeScreen.bannerContent}
              content={welcomeScreen.content}
              actions={welcomeScreen.actions}
              showBanner={true}
              bannerStyle={{ backgroundColor: 'transparent' }}
            />
          );
        }

        // Error Screen Short-Circuit - takes priority over confetti
        if (appState.showError) {
          debugLogger.log('info', 'AppContent', 'Rendering error screen', {
            errorMessage: appState.errorMessage
          });

          const handleRetry = () => {
            debugLogger.log('info', 'AppContent', 'Error retry clicked - triggering upload');
            dispatch({ type: APP_ACTIONS.CLEAR_ERROR });
            handleSubmit(); // Re-trigger upload with preserved recording blob
          };

          const handleCancel = () => {
            debugLogger.log('info', 'AppContent', 'Error cancel clicked - opening start over dialog');
            dispatch({ type: APP_ACTIONS.CLEAR_ERROR });
            navigationHandlers.handleStartOverClick();
          };

          return (
            <>
              <ErrorScreen
                errorMessage={appState.errorMessage}
                onRetry={handleRetry}
                onCancel={handleCancel}
              />
              <VaulStartOverDrawer
                open={showStartOverDialog}
                onOpenChange={setShowStartOverDialog}
                onConfirm={navigationHandlers.handleStartOverConfirm}
                onCancel={() => setShowStartOverDialog(false)}
              />
            </>
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

        // RecordingBar content for active/paused states (displayed in header A2)
        // Wrapped in TimerProvider to prevent re-renders
        // Use white visualizer color when on ActiveRecordingScreen or PausedRecordingScreen
        const isActiveRecordingScreen = screen.className === 'active-recording-state';
        const isPausedRecordingScreen = screen.className === 'paused-recording-state';
        const visualizerColor = (isActiveRecordingScreen || isPausedRecordingScreen) ? '#FFFFFF' : '#2C2F48';

        const recordingBarContent = (isRecording || isPaused) ? (
          <TimerProvider
            isActive={isRecording && !isPaused}
            onWarning={handleTimerWarning}
            onMaxDuration={handleTimerMaxDuration}
          >
            <RecordingBar
              totalSeconds={RECORDING_LIMITS.MAX_DURATION_SECONDS}
              isRecording={isRecording}
              isPaused={isPaused}
              formatTime={formatTime}
              mediaStream={mediaStream}
              visualizerColor={visualizerColor}
            />
          </TimerProvider>
        ) : null;

        // Prioritize screen-specific banner content, fallback to RecordingBar
        const bannerContent = screen.bannerContent || recordingBarContent;

        return (
          <>
            <MasterLayout
              className={screen.className || ''}
              bannerContent={formatBannerContent(bannerContent, tokens)}
              content={screen.content}
              actions={screen.actions}
              overlay={screen.overlay || null}
              showBanner={true}
              onBack={screen.onBack}
              showBackButton={screen.showBackButton}
              iconA3={screen.iconA3}
            >
              {/* Drawers within layout */}
              <VaulStartOverDrawer
                open={showStartOverDialog}
                onOpenChange={setShowStartOverDialog}
                onConfirm={navigationHandlers.handleStartOverConfirm}
                onCancel={() => setShowStartOverDialog(false)}
              />

              <VaulDeviceSettingsDrawer
                open={showDeviceSettingsDrawer}
                onOpenChange={setShowDeviceSettingsDrawer}
                {...deviceSettingsProps}
              />

              {appState.uploadInProgress && (
                <ProgressOverlay fraction={appState.uploadFraction} />
              )}
            </MasterLayout>

            {/* Full-app overlays (outside MasterLayout for full viewport coverage) */}
            {countdownActive && (
              <CountdownOverlay countdownValue={countdownValue} />
            )}
          </>
        );
      }}
    </RecordingFlow>
    </FirebaseErrorBoundary>
  );
}

export default AppContent;