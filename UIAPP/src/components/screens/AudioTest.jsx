/**
 * AudioTest.jsx
 * --------------
 * Audio test screen shown after user selects audio mode.
 * Displays audio visualizer to test microphone input.
 * Auto-requests microphone permission on mount.
 *
 * Flow:
 * 1. Screen loads - auto-requests microphone permission
 * 2. Shows "Waiting for microphone access..." while requesting
 * 3. Once permission granted, visualizer activates automatically
 * 4. User clicks Continue once to proceed to ReadyToRecordScreen
 * 5. If permission denied, shows error with "Try Again" button
 *
 * Props:
 * - mediaStream: MediaStream object when permission granted
 * - permissionState: 'idle' | 'requesting' | 'granted' | 'denied'
 * - onContinue: Handler when user clicks Continue (permission already granted)
 * - onRetry: Handler when user clicks Try Again after denial
 * - onBack: Handler for back navigation
 *
 * Returns standard screen format:
 * - timer: null
 * - content: AudioVisualizer component with state-based UI
 * - actions: Continue button (or Try Again if denied)
 */

import React from 'react';
import { FaArrowRight } from 'react-icons/fa';
import AudioVisualizer from '../AudioVisualizer';
import AudioDeviceSettings from './AudioDeviceSettings';
import { Button } from '../ui';
import { useTokens } from '../../theme/TokenProvider';

function AudioTest({ onContinue, onRetry, onSwitchDevice, mediaStream, permissionState, onBack }) {
  const { tokens } = useTokens();

  // Determine what to show based on permission state
  const showVisualizer = mediaStream && permissionState === 'granted';
  const showLoading = permissionState === 'requesting';
  const showError = permissionState === 'denied';

  return {
    bannerContent: 'Sound test',
    iconA3: (
      <AudioDeviceSettings
        mediaStream={mediaStream}
        onSwitchDevice={onSwitchDevice}
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
        gap: tokens.spacing[5],
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* Container - always rendered so AudioVisualizer can mount */}
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
          justifyContent: 'center',
          gap: 0
        }}>
          {/* AudioVisualizer always mounted for proper initialization */}
          <div style={{ width: '100%' }}>
            <AudioVisualizer mediaStream={mediaStream} height={100} />
          </div>
          <p style={{
            fontSize: tokens.fontSize.base,
            fontWeight: tokens.fontWeight.normal,
            color: tokens.colors.primary.DEFAULT,
            margin: 0,
            textAlign: 'center',
            lineHeight: '1.5',
            paddingTop: tokens.spacing[2],
            paddingLeft: tokens.spacing[2],
            paddingRight: tokens.spacing[2]
          }}>
            Line not moving when you speak? Tap the gear in the top right corner to troubleshoot.
          </p>
        </div>

        {/* Instruction text - shown below the visualizer container */}
        <p style={{
          fontSize: tokens.fontSize.base,
          fontWeight: tokens.fontWeight.normal,
          color: tokens.colors.primary.DEFAULT,
          margin: 0,
          textAlign: 'center',
          lineHeight: '1.5'
        }}>
          Check that the microphone bar moves with your voice.
        </p>

        {/* Loading state - shown while requesting permission */}
        {showLoading && (
          <div style={{
            fontSize: tokens.fontSize.sm,
            color: tokens.colors.neutral.gray['03'],
            textAlign: 'center',
            maxWidth: '400px',
            lineHeight: '1.4'
          }}>
            Waiting for microphone access...
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
              Microphone access was denied.
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
        disabled={!showVisualizer}
      >
        Next step <FaArrowRight style={{ marginLeft: '12px' }} />
      </Button>
    ),
    onBack
  };
}

export default AudioTest;
