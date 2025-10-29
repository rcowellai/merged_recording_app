/**
 * VideoTest.jsx
 * --------------
 * Video test screen shown after user selects video mode.
 * Displays live video preview to test camera input.
 * Auto-requests camera permission on mount.
 *
 * Flow:
 * 1. Screen loads - auto-requests camera permission
 * 2. Shows "Waiting for camera access..." while requesting
 * 3. Once permission granted, video preview activates automatically
 * 4. User clicks Continue to proceed to ReadyToRecordScreen
 * 5. If permission denied, shows error with "Try Again" button
 *
 * Props:
 * - mediaStream: MediaStream object when permission granted
 * - permissionState: 'idle' | 'requesting' | 'granted' | 'denied'
 * - onContinue: Handler when user clicks Continue (permission already granted)
 * - onRetry: Handler when user clicks Try Again after denial
 * - onSwitchDevice: Handler for device switching
 * - onOpenSettings: Handler to open device settings drawer
 * - onBack: Handler for back navigation
 * - videoRef: React ref for video element (managed by parent)
 *
 * Returns standard screen format:
 * - timer: null
 * - content: Video preview with state-based UI
 * - actions: Continue button (or Try Again if denied)
 */

import React from 'react';
import { FaArrowRight } from 'react-icons/fa';
import AudioVisualizer from '../AudioVisualizer';
import VideoDeviceSettings from './VideoDeviceSettings';
import { Button } from '../ui';
import { useTokens } from '../../theme/TokenProvider';

function VideoTest({ onContinue, onRetry, onSwitchDevice, onOpenSettings, mediaStream, permissionState, onBack, videoRef }) {
  const { tokens } = useTokens();

  // Determine what to show based on permission state
  const showPreview = mediaStream && permissionState === 'granted';
  const showLoading = permissionState === 'requesting';
  const showError = permissionState === 'denied';

  return {
    bannerContent: 'Video test',
    iconA3: (
      <VideoDeviceSettings
        mediaStream={mediaStream}
        onSwitchDevice={onSwitchDevice}
        onOpenSettings={onOpenSettings}
      />
    ),
    content: (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* Audio visualizer with key-based remounting for clean device switching */}
        <div style={{ marginBottom: '10px' }}>
          <AudioVisualizer
            key={mediaStream?.id || 'no-stream'}
            mediaStream={mediaStream}
            height={20}
            width={80}
          />
        </div>

        {/* Video preview element */}
        <div style={{ marginBottom: tokens.spacing[12] }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              maxWidth: '320px',
              height: '280px',
              borderRadius: '20px',
              backgroundColor: '#000000',
              objectFit: 'cover',
              display: showPreview ? 'block' : 'none'
            }}
          />
        </div>

        {showPreview && (
          <p style={{
            fontSize: tokens.fontSize.base,
            fontWeight: tokens.fontWeight.normal,
            color: tokens.colors.primary.DEFAULT,
            margin: 0,
            textAlign: 'center',
            lineHeight: '1.5'
          }}>
            Check that you can see yourself and that the microphone bar moves with your voice.
          </p>
        )}

        {/* Loading state - shown while requesting permission */}
        {showLoading && (
          <div style={{
            fontSize: tokens.fontSize.sm,
            color: tokens.colors.neutral.gray['03'],
            textAlign: 'center',
            maxWidth: '400px',
            lineHeight: '1.4'
          }}>
            Waiting for camera access...
          </div>
        )}

        {/* Error state - shown when permission denied */}
        {showError && (
          <div style={{
            fontSize: tokens.fontSize.sm,
            color: tokens.colors.status.error,
            textAlign: 'center',
            maxWidth: '400px',
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
