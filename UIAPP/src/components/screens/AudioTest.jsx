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
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

/**
 * AudioTestContent - Inner component that safely uses hooks
 */
function AudioTestContent({ mediaStream, permissionState }) {
  const { tokens } = useTokens();

  // Determine what to show based on permission state
  const showError = permissionState === 'denied';

  const outerLayout = useResponsiveLayout({
    section: 'content',
    customStyles: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: '2.25rem' // 36px - reduced by 25% from tokens.spacing[12] (48px)
    }
  });

  // Outer container - matches VideoTest.jsx pattern for consistent container heights
  const innerLayout = useResponsiveLayout({
    section: 'custom',
    flex: '1 1 auto',
    customStyles: {
      width: '100%',
      maxWidth: tokens.layout.maxWidth.md,
      minHeight: 0,
      maxHeight: 'calc(100dvh - var(--headerH) - var(--actionsH) - var(--contentPad) * 2 - 140px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      boxSizing: 'border-box'
    }
  });

  // Square container - matches VideoTest.jsx video wrapper pattern
  const squareContainerStyle = {
    maxWidth: 'min(500px, 100%)',
    maxHeight: 'min(425px, 100%)',
    aspectRatio: '500 / 425',
    borderRadius: tokens.borderRadius.DEFAULT,
    backgroundColor: '#ffffff',
    boxShadow: '0 20px 40px -10px rgba(44, 47, 72, 0.1)',
    padding: `${tokens.spacing[8]} ${tokens.spacing[4]}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    overflow: 'hidden'
  };

  return (
    <div style={outerLayout}>
      {/* Outer container - matches VideoTest structure */}
      <div style={innerLayout}>
        {/* Square container - replaces old innerLayout colored box */}
        <div style={squareContainerStyle}>
          {/* Wrapper for visualizer + text group */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0
          }}>
          {/* AudioVisualizer with key-based remounting for clean device switching */}
          <div style={{
            width: '100%',
            margin: 0,
            padding: 0
          }}>
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
            paddingLeft: tokens.spacing[2],
            paddingRight: tokens.spacing[2]
          }}>
            Line not moving when you speak? Tap the gear in the top right corner to troubleshoot.
          </p>
          </div>
        </div>
      </div>

      {/* Instruction text and error state - pushed to bottom of B2 */}
      <div style={{
        marginTop: 'auto',
        width: '100%'
      }}>
        <p style={{
          fontSize: tokens.fontSize.base,
          fontWeight: tokens.fontWeight.normal,
          color: tokens.colors.primary.DEFAULT,
          margin: 0,
          marginBottom: '1.8rem', // 28.8px - reduced by 40% from tokens.spacing[12] (48px)
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
            margin: '0 auto',
            marginTop: tokens.spacing[4],
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
    </div>
  );
}

function AudioTest({ onContinue, onRetry, onSwitchDevice, onOpenSettings, mediaStream, permissionState, onBack }) {
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
      <AudioTestContent
        mediaStream={mediaStream}
        permissionState={permissionState}
      />
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
