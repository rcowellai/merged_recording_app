/**
 * ReviewRecordingScreen.jsx
 * --------------------------
 * Shows recorded media in a player for review before upload.
 * Displays loading state while recording is being prepared.
 * Includes Start Over and Upload action buttons.
 *
 * Returns standard screen format:
 * - bannerContent: 'Review & submit' (displays in section A2)
 * - timer: null
 * - content: Media player
 * - actions: Start Over and Upload buttons
 */

import React from 'react';
import { FaUndo, FaCloudUploadAlt } from 'react-icons/fa';
import PlyrMediaPlayer from '../PlyrMediaPlayer';
import { Button, ButtonRow } from '../ui';
import { useTokens } from '../../theme/TokenProvider';
import { useBreakpoint } from '../../hooks/useBreakpoint';

/**
 * ReviewRecordingContent - Inner component that safely uses hooks
 */
function ReviewRecordingContent({ recordedBlobUrl, captureMode, actualMimeType, onPlayerReady }) {
  const { tokens } = useTokens();
  const { isMobile } = useBreakpoint();

  return !recordedBlobUrl ? (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: tokens.spacing[6],
      flex: 1
    }}>
      <div style={{
        fontSize: tokens.fontSize.lg,
        color: tokens.colors.neutral.gray['01']
      }}>
        Preparing your recording...
      </div>
    </div>
  ) : (
    <div style={{
      width: '100%',
      flex: isMobile ? 'none' : 1,
      height: isMobile ? '100%' : undefined,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'center' : 'flex-start',
      gap: tokens.spacing[12],
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Centering container matching VideoTest.jsx pattern */}
      <div style={{
        width: '100%',
        maxWidth: tokens.layout.maxWidth.md,
        flex: '1 1 auto',
        minHeight: 0,
        maxHeight: captureMode === 'video'
          ? 'calc(100dvh - var(--headerH) - var(--actionsH) - var(--contentPad) * 2 - 140px)'
          : undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        boxSizing: 'border-box'
      }}>
        <PlyrMediaPlayer
          src={recordedBlobUrl}
          type={captureMode}
          actualMimeType={actualMimeType}
          onReady={onPlayerReady}
        />
      </div>
    </div>
  );
}

function ReviewRecordingScreen({
  recordedBlobUrl,
  captureMode,
  actualMimeType,
  isPlayerReady,
  onPlayerReady,
  onStartOver,
  onUpload,
  onBack
}) {
  const { tokens } = useTokens();

  return {
    bannerContent: 'Review & submit',
    timer: null,
    content: (
      <ReviewRecordingContent
        recordedBlobUrl={recordedBlobUrl}
        captureMode={captureMode}
        actualMimeType={actualMimeType}
        onPlayerReady={onPlayerReady}
      />
    ),
    actions: (
      <ButtonRow>
        <Button
          variant="secondary"
          onClick={onStartOver}
          style={{
            width: '48%',
            backgroundColor: tokens.colors.button.leftHandButton,
            border: `0.5px solid ${tokens.colors.onboarding.fontColor}`,
            color: tokens.colors.primary.DEFAULT
          }}
          fullWidth={false}
        >
          <FaUndo style={{ marginRight: tokens.spacing[2] }} />
          Start Over
        </Button>
        <Button
          onClick={onUpload}
          style={{ width: '48%' }}
          fullWidth={false}
        >
          <FaCloudUploadAlt style={{ marginRight: tokens.spacing[2] }} />
          Upload
        </Button>
      </ButtonRow>
    ),
    onBack,
    showBackButton: false
  };
}

export default ReviewRecordingScreen;
