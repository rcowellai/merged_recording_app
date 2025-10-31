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
import { useBreakpoint } from '../../hooks/useBreakpoint';

/**
 * AudioTestContent - Inner component that safely uses hooks
 */
function AudioTestContent({ mediaStream, permissionState }) {
  const { tokens } = useTokens();
  const { isMobile } = useBreakpoint();

  // Determine what to show based on permission state
  const showError = permissionState === 'denied';

  return (
    <div style={{
      width: '100%',
      flex: isMobile ? 'none' : 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: tokens.spacing[12],
      boxSizing: 'border-box',
      overflow: 'hidden',
      // DEBUG: AudioTestContent wrapper
      // border: '3px solid blue'
    }}>
      {/* Container - always rendered so AudioVisualizer can mount */}
      <div style={{
        width: '100%',
        maxWidth: tokens.layout.maxWidth.md,
        flex: isMobile ? 'none' : '1 1 auto',
        maxHeight: isMobile ? 'none' : '350px',
        minHeight: isMobile ? '45vh' : undefined,
        // border: '5px solid red',
        borderRadius: tokens.borderRadius.lg,
        boxSizing: 'border-box',
        padding: `0 ${tokens.spacing[4]}`,
        backgroundColor: tokens.colors.button.leftHandButton,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0
      }}>
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
            // DEBUG: AudioVisualizer wrapper
            // border: '3px solid orange',
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
            paddingRight: tokens.spacing[2],
            // DEBUG: Instruction text inside visualizer
            // border: '2px solid purple',
            // backgroundColor: 'rgba(128, 0, 128, 0.1)'
          }}>
            Line not moving when you speak? Tap the gear in the top right corner to troubleshoot.
          </p>
        </div>
      </div>

      {/* Instruction text and error state - pushed to bottom of B2 */}
      <div style={{
        marginTop: 'auto',
        width: '100%',
        // DEBUG: Bottom instruction container
        // border: '3px solid green'
      }}>
        <p style={{
          fontSize: tokens.fontSize.base,
          fontWeight: tokens.fontWeight.normal,
          color: tokens.colors.primary.DEFAULT,
          margin: 0,
          marginBottom: tokens.spacing[12],
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
