/**
 * AudioTest.jsx
 * --------------
 * Audio test screen shown after user grants microphone permission.
 * Displays audio visualizer to test microphone input.
 *
 * Flow:
 * 1. User grants permission on AudioAccess screen
 * 2. AudioTest screen loads with mediaStream already provided
 * 3. Visualizer activates automatically with live microphone input
 * 4. User clicks Continue to proceed to ReadyToRecordScreen
 * 5. If issues occur, user can click gear icon for device settings
 *
 * Props:
 * - mediaStream: MediaStream object (always provided, permission already granted)
 * - permissionState: 'granted' | 'requesting' (always granted in normal flow)
 * - onContinue: Handler when user clicks Continue
 * - onRetry: Handler to return to AudioAccess screen
 * - onSwitchDevice: Handler for device switching
 * - onOpenSettings: Handler to open device settings drawer
 * - onBack: Handler for back navigation
 *
 * Returns standard screen format:
 * - bannerContent: "Sound test" header
 * - iconA3: AudioDeviceSettings gear icon
 * - content: AudioVisualizer component with instructions
 * - actions: Continue button
 */

import React from 'react';
import { FaArrowRight } from 'react-icons/fa';
import AudioVisualizer from '../AudioVisualizer';
import AudioDeviceSettings from './AudioDeviceSettings';
import { Button } from '../ui';
import { useTokens } from '../../theme/TokenProvider';

function AudioTest({ onContinue, onRetry, onSwitchDevice, onOpenSettings, mediaStream, permissionState, onBack }) {
  const { tokens } = useTokens();

  // Determine what to show based on permission state
  const showVisualizer = mediaStream && permissionState === 'granted';
  const showError = permissionState === 'denied';

  return {
    bannerContent: 'Sound test',
    iconA3: (
      <AudioDeviceSettings
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
          {/* AudioVisualizer with key-based remounting for clean device switching */}
          <div style={{ width: '100%' }}>
            <AudioVisualizer
              key={mediaStream?.id || 'no-stream'}
              mediaStream={mediaStream}
              height={100}
            />
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
