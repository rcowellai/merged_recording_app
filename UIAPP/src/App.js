/**
 * App.jsx
 * -------
 * The main user-facing page for recording audio or video.
 * Refactored to use useReducer and extracted components while preserving exact UI behavior.
 */

import React, { useReducer, useState, useCallback, useEffect } from 'react';
import { FaMicrophoneAlt, FaVideo, FaCircle, FaPause, FaPlay, FaUndo, FaCloudUploadAlt } from 'react-icons/fa';

// Configuration
import { RECORDING_LIMITS, TIME_FORMAT } from './config';

// State management
import { appReducer, initialAppState, APP_ACTIONS } from './reducers/appReducer';

// Extracted components
import RecordingFlow from './components/RecordingFlow';
import FirebaseErrorBoundary from './components/FirebaseErrorBoundary';

// Utility functions
import { createSubmissionHandler } from './utils/submissionHandlers';
import { createNavigationHandlers } from './utils/navigationHandlers';

// Existing components (unchanged)
import PromptCard from './components/PromptCard';
import RecordingBar from './components/RecordingBar';
import VideoPreview from './components/VideoPreview';
import AudioRecorder from './components/AudioRecorder';
import CountdownOverlay from './components/CountdownOverlay';
import ProgressOverlay from './components/ProgressOverlay';
import RadixStartOverDialog from './components/RadixStartOverDialog';
import PlyrMediaPlayer from './components/PlyrMediaPlayer';
import ConfettiScreen from './components/confettiScreen';
import AppBanner from './components/AppBanner';

import './styles/App.css';

function App() {
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
    dispatch({ type: APP_ACTIONS.SET_SUBMIT_STAGE, payload: true });
  }, [dispatch]);

  return (
    <FirebaseErrorBoundary component="Recording App">
      <RecordingFlow 
        onDoneAndSubmitStage={handleAutoTransition}
      >
      {(recordingFlowState) => {
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
        } = recordingFlowState;

        // Initialize extracted components and utility functions
        const handleSubmit = createSubmissionHandler({
          recordedBlobUrl,
          captureMode,
          actualMimeType,
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
          setIsPlayerReady
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

        // Confetti Short-Circuit (preserves exact logic from original App.js:106-108)
        if (appState.showConfetti) {
          return <ConfettiScreen docId={appState.docId} />;
        }

        // Main UI (preserves exact JSX structure from original App.js:353-489)
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
                  <PromptCard />
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

export default App;