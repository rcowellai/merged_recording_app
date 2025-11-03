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

import React, { useState } from 'react';
import { FaUndo, FaCloudUploadAlt } from 'react-icons/fa';
import PlyrMediaPlayer from '../PlyrMediaPlayer';
import VideoControls from '../VideoControls';
import { Button, ButtonRow } from '../ui';
import { useTokens } from '../../theme/TokenProvider';
import { useBreakpoint } from '../../hooks/useBreakpoint';

/**
 * ReviewRecordingContent - Inner component that safely uses hooks
 */
function ReviewRecordingContent({ recordedBlobUrl, captureMode, actualMimeType, onPlayerReady }) {
  const { tokens } = useTokens();
  const { isMobile } = useBreakpoint();

  // Store Plyr instance for external controls
  const [playerInstance, setPlayerInstance] = useState(null);

  // Handle player ready - store instance and call parent callback
  const handlePlayerReady = (player) => {
    setPlayerInstance(player);
    onPlayerReady?.(player);
  };

  return !recordedBlobUrl ? (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: tokens.spacing[6],
      flex: 1,
      border: '2px solid red'
    }}>
      <div style={{
        fontSize: tokens.fontSize.lg,
        color: tokens.colors.neutral.gray['01'],
        border: '2px solid orange'
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
      gap: tokens.spacing[0],  // 24px spacing (half of spacing[12])
      boxSizing: 'border-box',
      overflow: 'hidden',
      border: '2px solid blue'
    }}>
      <PlyrMediaPlayer
        src={recordedBlobUrl}
        type={captureMode}
        actualMimeType={actualMimeType}
        onReady={handlePlayerReady}
        hideControls={captureMode === 'video'}
      />

      {/* External controls for video player (Phase 1) */}
      {playerInstance && captureMode === 'video' && (
        <VideoControls player={playerInstance} />
      )}
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
