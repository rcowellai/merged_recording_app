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
import AudioVisualizer from '../AudioVisualizer';
import AudioDeviceSettings from './AudioDeviceSettings';

function AudioTest({ onContinue, onRetry, onSwitchDevice, mediaStream, permissionState, onBack }) {
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
        gap: 'var(--spacing-5)',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* Bordered container - always rendered so AudioVisualizer can mount */}
        <div style={{
          width: '100%',
          maxWidth: 'var(--layout-max-width-md)',
          border: showVisualizer ? '1px solid var(--color-onboarding-font)' : 'none',
          borderRadius: 'var(--border-radius-lg)',
          boxSizing: 'border-box',
          padding: 'var(--spacing-4)',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-3)'
        }}>
          {showVisualizer && (
            <p style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-normal)',
              color: 'var(--color-onboarding-font)',
              margin: 0,
              textAlign: 'center',
              lineHeight: '1.5'
            }}>
              Check that the sound bar moves with your voice.
            </p>
          )}
          {/* AudioVisualizer always mounted for proper initialization */}
          <AudioVisualizer mediaStream={mediaStream} height={200} />
          {showVisualizer && (
            <p style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-normal)',
              color: 'var(--color-onboarding-font)',
              margin: 0,
              textAlign: 'center',
              lineHeight: '1.5'
            }}>
              Tap the gear in the right-hand corner to troubleshoot.
            </p>
          )}
        </div>

        {/* Loading state - shown while requesting permission */}
        {showLoading && (
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-neutral-gray-03)',
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
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-error, #d32f2f)',
            textAlign: 'center',
            maxWidth: '400px',
            lineHeight: '1.4'
          }}>
            <p style={{
              margin: '0 0 var(--spacing-2) 0',
              fontWeight: 'var(--font-weight-medium)'
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
      <button
        type="button"
        className="single-button-full"
        onClick={onRetry}
      >
        Try Again
      </button>
    ) : (
      <button
        type="button"
        className="single-button-full"
        onClick={onContinue}
        disabled={!showVisualizer}
      >
        Continue
      </button>
    ),
    onBack
  };
}

export default AudioTest;
