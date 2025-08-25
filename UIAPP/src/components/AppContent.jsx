/**
 * AppContent.jsx
 * --------------
 * The main recording interface component extracted from App.js
 * Renders when a valid session is found and validated
 */

import React, { useReducer, useState, useCallback, useEffect } from 'react';
import { FaMicrophoneAlt, FaVideo, FaCircle, FaPause, FaPlay, FaUndo, FaCloudUploadAlt } from 'react-icons/fa';
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
import { initializeUploadDebugging } from '../utils/uploadDebugger.js';

// Existing components (unchanged)
import PromptCard from './PromptCard';
import RecordingBar from './RecordingBar';
import VideoPreview from './VideoPreview';
import AudioRecorder from './AudioRecorder';
import CountdownOverlay from './CountdownOverlay';
import ProgressOverlay from './ProgressOverlay';
import RadixStartOverDialog from './RadixStartOverDialog';
import PlyrMediaPlayer from './PlyrMediaPlayer';
import ConfettiScreen from './confettiScreen';
import ErrorScreen from './ErrorScreen';
import AppBanner from './AppBanner';

import '../styles/App.css';

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

  // Initialize upload debugging panel
  useEffect(() => {
    initializeUploadDebugging();
  }, []);
  
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

        // Render Helpers (preserves exact logic from original App.js:252-348)
        function renderReviewButtons() {
          return renderTwoButtonRow(
            <>
              <FaUndo style={{ marginRight: '8px' }} />
              Start Over
            </>,
            navigationHandlers.handleStartOverClick,
            <>
              <FaCloudUploadAlt style={{ marginRight: '8px' }} />
              Upload
            </>,
            handleSubmit
          );
        }

        function renderTwoButtonRow(leftText, leftOnClick, rightText, rightOnClick) {
          return (
            <div className="two-button-row">
              <button
                type="button"
                className="two-button-left"
                onClick={leftOnClick}
              >
                {leftText}
              </button>
              <button
                type="button"
                className="two-button-right"
                onClick={rightOnClick}
              >
                {rightText}
              </button>
            </div>
          );
        }

        function renderSingleButtonPlusPreview(buttonText, buttonOnClick) {
          const previewElement =
            captureMode === 'audio'
              ? <AudioRecorder stream={mediaStream} isRecording={isRecording} />
              : <VideoPreview stream={mediaStream} />;

          return (
            <div className="single-plus-video-row">
              <div className="single-plus-left">
                {mediaStream ? previewElement : <div className="video-placeholder" />}
              </div>
              <button
                type="button"
                className="single-plus-right"
                onClick={buttonOnClick}
              >
                {buttonText}
              </button>
            </div>
          );
        }

        function renderBottomRow() {
          // Show "Audio" & "Video" if no stream, captureMode == null, and not in submit stage
          if (!mediaStream && captureMode == null && !appState.submitStage) {
            return renderTwoButtonRow(
              <>
                <FaMicrophoneAlt style={{ marginRight: '8px' }} />
                Audio
              </>,
              handleAudioClick,
              <>
                <FaVideo style={{ marginRight: '8px' }} />
                Video
              </>,
              handleVideoClick
            );
          }

          if (!isRecording && !isPaused && !appState.submitStage && mediaStream) {
            // Start
            return renderSingleButtonPlusPreview(
              <>
                <FaCircle style={{ marginRight: '8px' }} />
                Start recording
              </>,
              handleStartRecording
            );
          }

          if (isRecording && !isPaused && !appState.submitStage) {
            // Pause
            return renderSingleButtonPlusPreview(
              <>
                <FaPause style={{ marginRight: '8px' }} />
                Pause
              </>,
              handlePause
            );
          }

          if (isPaused && !appState.submitStage) {
            // Resume + Done
            return renderTwoButtonRow(
              <>
                <FaPlay style={{ marginRight: '8px' }} />
                Resume
              </>,
              handleResume,
              'Done',
              navigationHandlers.handleDoneAndSubmitStage
            );
          }

          return null;
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
            <AppBanner logoSize={30} />
            
            <div className="page-container">
            {(isRecording || isPaused) && (
              <div
                className="recording-bar-container"
                style={{
                  position: 'fixed',
                  top: 'calc(var(--banner-height) + 30px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '97%',
                  maxWidth: '448px', // 480px - 32px (accounting for 16px padding on each side)
                  zIndex: 999,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <div style={{ width: '100%', padding: '0 16px' }}>
                  <RecordingBar
                    elapsedSeconds={elapsedSeconds}
                    totalSeconds={RECORDING_LIMITS.MAX_DURATION_SECONDS}
                    isRecording={isRecording}
                    isPaused={isPaused}
                    formatTime={formatTime}
                  />
                </div>
              </div>
            )}

            <div className="app-layout">
              <div className="banner-section">
                <AppBanner logoSize={30} />
              </div>
              <div className="prompt-section">
                {!appState.submitStage ? (
                  <PromptCard sessionData={sessionData} />
                ) : !recordedBlobUrl ? (
                  <div className="review-content">
                    <div className="review-title">Review your recording</div>
                    <div className="loading-message">Preparing your recording...</div>
                  </div>
                ) : (
                  <div className="review-content">
                    <div className="review-title">Review your recording</div>
                    <PlyrMediaPlayer
                      src={recordedBlobUrl}
                      type={captureMode}
                      actualMimeType={actualMimeType}
                      onReady={() => setIsPlayerReady(true)}
                      className="inline-media-player"
                    />
                  </div>
                )}
              </div>
              <div 
                className="spacing-section"
                style={{
                  visibility: (mediaStream || appState.submitStage) ? 'hidden' : 'visible',
                }}
              >
                Choose your recording mode
              </div>
              <div className="actions-section">
                {appState.submitStage ? renderReviewButtons() : renderBottomRow()}
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