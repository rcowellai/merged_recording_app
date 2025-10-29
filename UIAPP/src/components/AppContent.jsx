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

// Timer context
import { TimerProvider } from '../contexts/TimerContext';

// Utility functions
import { createSubmissionHandler } from '../utils/submissionHandlers';
import { createNavigationHandlers } from '../utils/navigationHandlers';

// Existing components
import RecordingBar from './RecordingBar';
import CountdownOverlay from './CountdownOverlay';
import ProgressOverlay from './ProgressOverlay';
// import RadixStartOverDialog from './RadixStartOverDialog'; // Replaced with VaulStartOverDrawer
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
 * Formats banner content based on type for consistent header display.
 *
 * @param {*} content - Banner content (string, React node, or null)
 * @param {Object} tokens - Design tokens from TokenProvider
 * @returns {React.Node|null} Formatted content for banner A2 section
 *
 * Behavior:
 * - String: Wraps with styling (like old bannerText pattern)
 * - React node: Renders as-is (e.g., RecordingBar component)
 * - null/undefined: Returns null (shows default logo)
 */
function formatBannerContent(content, tokens) {
  if (!content) return null;

  // String content: Apply text styling for consistency
  if (typeof content === 'string') {
    return (
      <div style={{
        fontSize: tokens.fontSize['2xl'],
        color: tokens.colors.primary.DEFAULT,
        fontWeight: tokens.fontWeight.normal,
        fontFamily: 'inherit',
        textAlign: 'center'
      }}>
        {content}
      </div>
    );
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

  // Ref to store current recording flow state for timer callbacks
  const recordingFlowStateRef = useRef(null);

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

  // Watch mediaStream to detect successful permission grant OR device switch completion
  useEffect(() => {
    const { captureMode, mediaStream } = recordingFlowStateSnapshot;

    // Handle initial permission grant
    if (captureMode === 'audio' && mediaStream && audioPermissionState === 'requesting') {
      debugLogger.log('info', 'AppContent', 'Microphone permission granted');
      setAudioPermissionState('granted');
      audioRequestInProgressRef.current = false;
    }

    // Handle device switch - ensure permission stays granted when mediaStream updates
    if (captureMode === 'audio' && mediaStream && audioPermissionState === 'granted') {
      // Permission state is already correct, but this ensures UI updates
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

  // Watch mediaStream to detect successful video permission grant OR device switch completion
  useEffect(() => {
    const { captureMode, mediaStream } = recordingFlowStateSnapshot;

    // Handle initial permission grant
    if (captureMode === 'video' && mediaStream && videoPermissionState === 'requesting') {
      debugLogger.log('info', 'AppContent', 'Camera permission granted');
      setVideoPermissionState('granted');
      videoRequestInProgressRef.current = false;
    }

    // Handle device switch - log state transition for debugging
    // Permission state remains 'granted' - UI updates via recordingFlowStateSnapshot dependency
    if (captureMode === 'video' && mediaStream && videoPermissionState === 'granted') {
      // Permission state is already correct, UI updates via recordingFlowStateSnapshot dependency
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
  }, [dispatch, audioPermissionState, recordingFlowStateSnapshot.mediaStream]);

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
  }, [dispatch, videoPermissionState, recordingFlowStateSnapshot.mediaStream]);

  // Device settings drawer handler - stores props and opens drawer
  const handleOpenDeviceSettings = useCallback((props) => {
    debugLogger.log('info', 'AppContent', 'Opening device settings drawer', { deviceType: props?.deviceType });
    setDeviceSettingsProps(props);
    setShowDeviceSettingsDrawer(true);
  }, []);

  // RecordingFlow state change handler
  // FIXED: Moved state synchronization from render to callback to prevent setState-during-render warning
  const handleRecordingFlowStateChange = useCallback((newState) => {
    const { captureMode, mediaStream, handleAudioClick, handleVideoClick } = newState;

    // Only update if values actually changed (prevents unnecessary re-renders)
    setRecordingFlowStateSnapshot(prev => {
      const hasChanged =
        prev.captureMode !== captureMode ||
        prev.mediaStream !== mediaStream ||
        prev.handleAudioClick !== handleAudioClick ||
        prev.handleVideoClick !== handleVideoClick;

      if (!hasChanged) {
        return prev; // No change, prevent re-render
      }

      return {
        captureMode,
        mediaStream,
        handleAudioClick,
        handleVideoClick
      };
    });
  }, [audioPermissionState]);

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
              onSwitchDevice: handleSwitchAudioDevice,
              onOpenSettings: handleOpenDeviceSettings,
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
              onSwitchDevice: handleSwitchVideoDevice, // Video device (camera) switching handler
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
                devices={deviceSettingsProps?.devices || []}
                selectedDeviceId={deviceSettingsProps?.selectedDeviceId}
                onSelectDevice={async (deviceId) => {
                  try {
                    await deviceSettingsProps?.onSelectDevice?.(deviceId);
                    setShowDeviceSettingsDrawer(false); // Auto-close on success
                  } catch (error) {
                    console.error('Device switch failed:', error);
                    // Keep drawer open on error
                  }
                }}
                deviceType={deviceSettingsProps?.deviceType || 'audioinput'}
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