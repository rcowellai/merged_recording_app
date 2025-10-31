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

  const content = !recordedBlobUrl ? (
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
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing[5],
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Container for audio mode - matches AudioTest styling */}
      {captureMode === 'audio' ? (
        <div style={{
          width: '100%',
          maxWidth: tokens.layout.maxWidth.md,
          minHeight: '55vh',
          border: `0.5px solid rgba(113, 128, 150, 0.5)`,
          borderRadius: tokens.borderRadius.lg,
          boxSizing: 'border-box',
          padding: tokens.spacing[4],
          backgroundColor: tokens.colors.button.leftHandButton,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <PlyrMediaPlayer
            src={recordedBlobUrl}
            type={captureMode}
            actualMimeType={actualMimeType}
            onReady={onPlayerReady}
            style={{ width: '100%' }}
          />
        </div>
      ) : (
        <PlyrMediaPlayer
          src={recordedBlobUrl}
          type={captureMode}
          actualMimeType={actualMimeType}
          onReady={onPlayerReady}
          style={{ width: '100%', maxHeight: '60vh' }}
        />
      )}
    </div>
  );

  return {
    bannerContent: 'Review & submit',
    timer: null,
    content,
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
