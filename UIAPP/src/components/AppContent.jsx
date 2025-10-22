/**
 * AppContent.jsx
 * --------------
 * The main recording interface component extracted from App.js
 * Renders when a valid session is found and validated
 */

import React, { useReducer, useState, useCallback, useEffect } from 'react';
import { FaUndo, FaCloudUploadAlt, FaMicrophoneAlt, FaVideo } from 'react-icons/fa';
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
import PromptCard from './PromptCard';
import RecordingBar from './RecordingBar';
import CountdownOverlay from './CountdownOverlay';
import ProgressOverlay from './ProgressOverlay';
import RadixStartOverDialog from './RadixStartOverDialog';
import ConfettiScreen from './confettiScreen';
import ErrorScreen from './ErrorScreen';
import AppBanner from './AppBanner';

// Screen components (Phase 2: Screen-based architecture)
import WelcomeScreen from './screens/WelcomeScreen';
import PromptReadScreen from './screens/PromptReadScreen';
import ChooseModeScreen from './screens/ChooseModeScreen';
import ReadyToRecordScreen from './screens/ReadyToRecordScreen';
import ActiveRecordingScreen from './screens/ActiveRecordingScreen';
import PausedRecordingScreen from './screens/PausedRecordingScreen';
import ReviewRecordingContent from './screens/ReviewRecordingContent';

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

  // Reset player ready state when entering review mode
  useEffect(() => {
    if (appState.submitStage) {
      setIsPlayerReady(false);
    }
  }, [appState.submitStage]);

  // Create auto-transition handler that will be passed to RecordingFlow
  const handleAutoTransition = useCallback(() => {
    debugLogger.log('info', 'AppContent', 'Auto-transitioning to submit stage');
    dispatch({ type: APP_ACTIONS.SET_SUBMIT_STAGE, payload: true });
  }, [dispatch]);

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
          resetRecordingState
        });

        // Format Time utility (using constants for maintainability)
        const formatTime = (sec) => {
          if (!sec || isNaN(sec) || !isFinite(sec)) return TIME_FORMAT.DEFAULT_TIME_DISPLAY;
          const m = Math.floor(sec / TIME_FORMAT.SECONDS_PER_MINUTE);
          const s = Math.floor(sec % TIME_FORMAT.SECONDS_PER_MINUTE);
          return `${m}:${s < TIME_FORMAT.ZERO_PADDING_THRESHOLD ? '0' : ''}${s}`;
        };

        // Screen Router - determines which screen to show in actions-section
        function renderCurrentActions() {
          // Review stage: Show Start Over + Upload buttons
          if (appState.submitStage) {
            return (
              <div className="two-button-row">
                <button
                  type="button"
                  className="two-button-left"
                  onClick={navigationHandlers.handleStartOverClick}
                >
                  <FaUndo style={{ marginRight: '8px' }} />
                  Start Over
                </button>
                <button
                  type="button"
                  className="two-button-right"
                  onClick={handleSubmit}
                >
                  <FaCloudUploadAlt style={{ marginRight: '8px' }} />
                  Upload
                </button>
              </div>
            );
          }

          // Prompt read screen - first screen after welcome
          if (!appState.hasReadPrompt) {
            return (
              <PromptReadScreen
                onContinue={() => {
                  debugLogger.log('info', 'AppContent', 'Prompt read, proceeding to mode selection');
                  dispatch({ type: APP_ACTIONS.SET_HAS_READ_PROMPT, payload: true });
                }}
              />
            );
          }

          // Mode selection - choose audio or video
          if (appState.hasReadPrompt && !mediaStream && captureMode == null) {
            return (
              <ChooseModeScreen
                onAudioClick={handleAudioClick}
                onVideoClick={handleVideoClick}
              />
            );
          }

          // Ready to start recording
          if (!isRecording && !isPaused && mediaStream) {
            return (
              <ReadyToRecordScreen
                captureMode={captureMode}
                mediaStream={mediaStream}
                onStartRecording={handleStartRecording}
              />
            );
          }

          // Recording in progress
          if (isRecording && !isPaused) {
            return (
              <ActiveRecordingScreen
                captureMode={captureMode}
                mediaStream={mediaStream}
                onPause={handlePause}
              />
            );
          }

          // Paused state
          if (isPaused) {
            return (
              <PausedRecordingScreen
                onResume={handleResume}
                onDone={navigationHandlers.handleDoneAndSubmitStage}
              />
            );
          }

          return null;
        }

        // Welcome Screen - First screen users see
        // Background applied to page-container via welcome-state class
        // Message in prompt-section (green border), button in actions-section (purple border)
        if (appState.showWelcome) {
          const welcomeScreen = WelcomeScreen({
            sessionData,
            onContinue: () => {
              debugLogger.log('info', 'AppContent', 'Welcome screen continue clicked');
              dispatch({ type: APP_ACTIONS.SET_SHOW_WELCOME, payload: false });
            }
          });

          return (
            <>
              <div className="page-container welcome-state">
                <AppBanner logoSize={30} />

                <div className="app-layout">
                  {/* Timer bar section - empty for welcome screen */}
                  <div className="timer-bar-section"></div>

                  {/* Prompt section - contains animated welcome message */}
                  <div className="prompt-section">
                    {welcomeScreen.message}
                  </div>

                  {/* Spacing section - hidden for welcome */}
                  <div className="spacing-section" style={{ visibility: 'hidden' }}></div>

                  {/* Actions section - contains Continue button */}
                  <div className="actions-section">
                    {welcomeScreen.button}
                  </div>
                </div>
              </div>
            </>
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

        // Main UI (preserves exact JSX structure from original App.js:353-489)
        debugLogger.log('info', 'AppContent', 'Rendering main recording UI', {
          submitStage: appState.submitStage,
          uploadInProgress: appState.uploadInProgress,
          captureMode,
          isRecording,
          isPaused,
          hasRecordedBlobUrl: !!recordedBlobUrl
        });
        
        return (
          <>
            <div className="page-container">
            <AppBanner logoSize={30} />

            <div className="app-layout">
              {/* Timer bar section - always present, conditionally populated */}
              <div className="timer-bar-section">
                {(isRecording || isPaused) ? (
                  <div className="recording-bar-container">
                    <RecordingBar
                      elapsedSeconds={elapsedSeconds}
                      totalSeconds={RECORDING_LIMITS.MAX_DURATION_SECONDS}
                      isRecording={isRecording}
                      isPaused={isPaused}
                      formatTime={formatTime}
                    />
                  </div>
                ) : (appState.hasReadPrompt && !mediaStream && captureMode == null) ? (
                  // ChooseModeScreen: Show "Choose your recording mode" text
                  <div style={{
                    fontSize: '0.95rem',
                    color: '#2C2F48',
                    fontFamily: 'inherit',
                    textAlign: 'center',
                    width: '100%'
                  }}>
                    Choose your recording mode
                  </div>
                ) : null}
              </div>

              <div
                className="prompt-section"
                style={{
                  padding: (appState.hasReadPrompt && !mediaStream && captureMode == null) ? '0' : undefined,
                  display: (appState.hasReadPrompt && !mediaStream && captureMode == null) ? 'flex' : undefined,
                  alignItems: (appState.hasReadPrompt && !mediaStream && captureMode == null) ? 'center' : undefined,
                  justifyContent: (appState.hasReadPrompt && !mediaStream && captureMode == null) ? 'center' : undefined
                }}
              >
                {!appState.submitStage ? (
                  // Show PromptCard except when on ChooseModeScreen
                  (appState.hasReadPrompt && !mediaStream && captureMode == null) ? (
                    // ChooseModeScreen: Show icons only - padding removed from parent for true centering
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      width: '100%',
                      gap: '30px'
                    }}>
                      <FaMicrophoneAlt size={100} color="#2C2F48" />
                      <FaVideo size={100} color="#2C2F48" />
                    </div>
                  ) : (
                    <PromptCard sessionData={sessionData} />
                  )
                ) : (
                  <ReviewRecordingContent
                    recordedBlobUrl={recordedBlobUrl}
                    captureMode={captureMode}
                    actualMimeType={actualMimeType}
                    isPlayerReady={isPlayerReady}
                    onPlayerReady={() => setIsPlayerReady(true)}
                  />
                )}
              </div>
              <div
                className="spacing-section"
                style={{
                  visibility: (mediaStream || appState.submitStage) ? 'hidden' : 'visible',
                }}
              >
              </div>
              <div className="actions-section">
                {renderCurrentActions()}
              </div>
            </div>

            {/* Countdown Overlay */}
            {countdownActive && (
              <CountdownOverlay countdownValue={countdownValue} />
            )}

            {/* Start Over Dialog */}
            <RadixStartOverDialog
              open={showStartOverDialog}
              onOpenChange={setShowStartOverDialog}
              onConfirm={navigationHandlers.handleStartOverConfirm}
              onCancel={() => setShowStartOverDialog(false)}
            />

            {/* Upload Overlay => progress */}
            {appState.uploadInProgress && (
              <ProgressOverlay fraction={appState.uploadFraction} />
            )}
            </div>
          </>
        );
      }}
    </RecordingFlow>
    </FirebaseErrorBoundary>
  );
}

export default AppContent;