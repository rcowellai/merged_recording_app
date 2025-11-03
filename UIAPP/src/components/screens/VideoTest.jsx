/**
 * VideoTest.jsx
 * --------------
 * Video test screen shown after user grants camera permission.
 * Displays live video preview to test camera input.
 *
 * Flow:
 * 1. User grants permission on VideoAccess screen
 * 2. VideoTest screen loads with mediaStream already provided
 * 3. Video preview activates automatically with live camera feed
 * 4. User clicks Continue to proceed to ReadyToRecordScreen
 * 5. If issues occur, user can click gear icon for device settings
 *
 * Props:
 * - mediaStream: MediaStream object (always provided, permission already granted)
 * - permissionState: 'granted' | 'requesting' (always granted in normal flow)
 * - videoRef: React ref for video element (managed by parent)
 * - onContinue: Handler when user clicks Continue
 * - onRetry: Handler to return to VideoAccess screen
 * - onSwitchDevice: Handler for device switching
 * - onOpenSettings: Handler to open device settings drawer
 * - onBack: Handler for back navigation
 *
 * Returns standard screen format:
 * - bannerContent: "Video test" header
 * - iconA3: VideoDeviceSettings gear icon
 * - content: Video preview with audio visualizer and instructions
 * - actions: Continue button
 */

import React from 'react';
import { FaArrowRight } from 'react-icons/fa';
import AudioVisualizer from '../AudioVisualizer';
import VideoDeviceSettings from './VideoDeviceSettings';
import { Button } from '../ui';
import { useTokens } from '../../theme/TokenProvider';
import { useBreakpoint } from '../../hooks/useBreakpoint';

/**
 * VideoTestContent - Inner component that safely uses hooks
 */
function VideoTestContent({ mediaStream, permissionState, videoRef }) {
  const { tokens } = useTokens();
  const { isMobile } = useBreakpoint();

  const showPreview = mediaStream && permissionState === 'granted';
  const showError = permissionState === 'denied';

  return (
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
      overflow: 'hidden',
      // DEBUG: VideoTestContent wrapper
      // border: '3px solid blue'
    }}>
      {/* Centering container for video content */}
      <div style={{
        width: '100%',
        maxWidth: tokens.layout.maxWidth.md,
        flex: '1 1 auto',
        // Allow this flex child to actually shrink
        minHeight: 0,
        // Cap growth to keep all content visible (visualizer ~60px + gap + bottom text)
        maxHeight: 'calc(100dvh - var(--headerH) - var(--actionsH) - var(--contentPad) * 2 - 140px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        boxSizing: 'border-box',
        // DEBUG: Centering container
        // border: '5px solid red'
      }}>
        {/* Audio visualizer with key-based remounting for clean device switching */}
        <div style={{
          marginBottom: '10px',
          // DEBUG: AudioVisualizer wrapper
          // border: '3px solid orange'
        }}>
          <AudioVisualizer
            key={mediaStream?.id || 'no-stream'}
            mediaStream={mediaStream}
            height={isMobile ? 20 : 50}
            width={isMobile ? 80 : 200}
          />
        </div>

        {/* Video preview element */}
        <div style={{
          // aspectRatio controls sizing - width will match constrained height
          maxWidth: 'min(500px, 100%)',
          maxHeight: 'min(500px, 100%)',
          aspectRatio: '1 / 1',
          marginBottom: isMobile ? tokens.spacing[0] : 0,
          overflow: 'hidden',
          borderRadius: '20px',
          backgroundColor: 'transparent',
          // DEBUG: Video wrapper
          // border: '3px solid purple'
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              // Fill the square wrapper
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: showPreview ? 'block' : 'none'
            }}
          />
        </div>
      </div>

      {/* Bottom container - pushed to bottom on desktop/tablet */}
      <div style={{
        width: '100%',
        // DEBUG: Bottom container
        // border: '3px solid green'
      }}>
        {showPreview && (
          <p style={{
            fontSize: tokens.fontSize.base,
            fontWeight: tokens.fontWeight.normal,
            color: tokens.colors.primary.DEFAULT,
            margin: 0,
            marginBottom: tokens.spacing[12],
            textAlign: 'center',
            lineHeight: '1.5'
          }}>
            Check that you can see yourself and that the microphone bar moves with your voice.
          </p>
        )}

        {/* Error state - shown when permission denied */}
        {showError && (
          <div style={{
            fontSize: tokens.fontSize.sm,
            color: tokens.colors.status.error,
            textAlign: 'center',
            maxWidth: '400px',
            margin: '0 auto',
            lineHeight: '1.4'
          }}>
            <p style={{
              margin: `0 0 ${tokens.spacing[2]} 0`,
              fontWeight: tokens.fontWeight.medium
            }}>
              Camera access was denied.
            </p>
            <p style={{ margin: 0 }}>
              Please grant permission to continue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function VideoTest({ onContinue, onRetry, onSwitchDevice, onOpenSettings, mediaStream, permissionState, onBack, videoRef }) {
  // Determine what to show based on permission state
  const showPreview = mediaStream && permissionState === 'granted';
  const showError = permissionState === 'denied';

  return {
    bannerContent: 'Camera and sound test',
    iconA3: (
      <VideoDeviceSettings
        mediaStream={mediaStream}
        onSwitchDevice={onSwitchDevice}
        onOpenSettings={onOpenSettings}
      />
    ),
    content: (
      <VideoTestContent
        mediaStream={mediaStream}
        permissionState={permissionState}
        videoRef={videoRef}
      />
    ),
    actions: showError ? (
      <Button onClick={onRetry}>
        Try Again
      </Button>
    ) : (
      <Button
        onClick={onContinue}
        disabled={!showPreview}
      >
        Next step <FaArrowRight style={{ marginLeft: '12px' }} />
      </Button>
    ),
    onBack
  };
}

export default VideoTest;
