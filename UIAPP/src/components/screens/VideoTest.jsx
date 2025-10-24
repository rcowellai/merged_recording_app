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
 * - onBack: Handler for back navigation
 * - videoRef: React ref for video element (managed by parent)
 *
 * Returns standard screen format:
 * - timer: null
 * - content: Video preview with state-based UI
 * - actions: Continue button (or Try Again if denied)
 */

import React from 'react';
import { MdSettings } from 'react-icons/md';
import AudioVisualizer from '../AudioVisualizer';

function VideoTest({ onContinue, onRetry, mediaStream, permissionState, onBack, videoRef }) {

  // Determine what to show based on permission state
  const showPreview = mediaStream && permissionState === 'granted';
  const showLoading = permissionState === 'requesting';
  const showError = permissionState === 'denied';

  return {
    bannerText: 'Video test',
    timer: null,
    iconA3: (
      <MdSettings
        size={32}
        color="var(--color-primary-default)"
        style={{ cursor: 'pointer' }}
        onClick={() => {
          console.log('Settings icon clicked - troubleshooting functionality to be implemented');
          // TODO: Implement troubleshooting/settings modal or navigation
        }}
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
        {/* Audio visualizer */}
        <AudioVisualizer mediaStream={mediaStream} height={20} width={80}/>

        {/* Video preview element */}
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

        {showPreview && (
          <p style={{
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-normal)',
            color: 'var(--color-onboarding-font)',
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
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-neutral-gray-03)',
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
        disabled={!showPreview}
      >
        Continue
      </button>
    ),
    onBack
  };
}

export default VideoTest;
