/**
 * VideoAccess.jsx
 * ---------------
 * Permission request screen for camera access.
 * Shown before VideoTest screen when camera permission not yet granted.
 * Provides context to user about why permission is needed.
 *
 * IMPROVEMENTS:
 * - Inline error handling (no alert())
 * - Timeout handling (60 second limit)
 * - User-friendly error messages with actionable guidance
 * - Automatic retry on errors
 *
 * Flow:
 * 1. User sees explanation of why camera access is needed
 * 2. User clicks "Turn on camera" button
 * 3. Button triggers browser permission prompt via getUserMedia
 * 4. On success: navigate to VideoTest screen
 * 5. On failure: show inline error with actionable guidance
 *
 * Props:
 * - onPermissionGranted: Handler called when permission successfully granted (receives stream)
 * - onPermissionDenied: Handler called when permission denied (receives error)
 * - onBack: Handler for back navigation
 *
 * Returns standard screen format:
 * - bannerContent: "Camera access" header
 * - content: Icon, explanation text, and error messages
 * - actions: "Turn on camera" or "Try Again" button
 */

import React from 'react';
import { FaVideo } from 'react-icons/fa';
import { Button } from '../ui';
import { useTokens } from '../../theme/TokenProvider';

function VideoAccess({ onPermissionGranted, onPermissionDenied, onBack, errorMessage, isRequesting }) {
  const { tokens } = useTokens();

  const handleTurnOnCamera = async () => {
    // Timeout promise: fail if user doesn't respond in 60 seconds
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 60000)
    );

    try {
      // Request camera AND microphone permission via getUserMedia with timeout
      // Video mode requires both
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        }),
        timeoutPromise
      ]);

      console.log('[VideoAccess] Camera permission GRANTED');

      // Permission granted - call success handler with stream
      onPermissionGranted(stream);
    } catch (error) {
      console.error('[VideoAccess] Camera permission DENIED or ERROR');
      console.error('[VideoAccess] Error details:', {
        name: error.name,
        message: error.message
      });

      // Map error to user-friendly message with actionable guidance
      let message = 'Camera access was denied.';

      if (error.message === 'TIMEOUT') {
        message = 'Permission request timed out. Please try again and respond to your browser\'s permission prompt.';
      } else if (error.name === 'NotAllowedError') {
        message = 'Camera access was denied. Please click "Allow" when your browser asks for permission.';
      } else if (error.name === 'NotFoundError') {
        message = 'No camera detected. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        message = 'Camera is already in use by another application. Please close other apps and try again.';
      } else if (error.name === 'OverconstrainedError') {
        message = 'Camera configuration error. Please try again or use a different camera.';
      } else if (error.name === 'SecurityError') {
        message = 'Camera access blocked for security reasons. Please check your browser settings.';
      }

      // Permission denied - call error handler with message
      onPermissionDenied(error, message);
    }
  };

  return {
    bannerContent: 'Camera access',
    content: (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: tokens.spacing[12]
        }}>
          {/* Camera Icon */}
          <FaVideo size={85} color="rgba(44, 47, 72, 0.85)" />

          {/* Explanation Text */}
          <div style={{
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <p style={{
              fontSize: tokens.fontSize.base,
              fontWeight: tokens.fontWeight.normal,
              color: tokens.colors.primary.DEFAULT,
              margin: `0 0 ${tokens.spacing[4]} 0`,
              lineHeight: '1.5'
            }}>
              Please allow camera access on your device
            </p>
            <p style={{
              fontSize: tokens.fontSize.base,
              fontWeight: tokens.fontWeight.normal,
              color: tokens.colors.primary.DEFAULT,
              margin: 0,
              lineHeight: '1.5'
            }}>
              To record your stories, we need temporary access to your camera.
            </p>
          </div>

          {/* Inline Error Message - BETTER UX than alert() */}
          {errorMessage && (
            <div style={{
              backgroundColor: tokens.colors.status.errorLight || '#FEE',
              border: `1px solid ${tokens.colors.status.error}`,
              borderRadius: tokens.borderRadius.md,
              padding: tokens.spacing[4],
              maxWidth: '400px',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <p style={{
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.medium,
                color: tokens.colors.status.error,
                margin: `0 0 ${tokens.spacing[2]} 0`
              }}>
                <strong>Permission Error</strong>
              </p>
              <p style={{
                fontSize: tokens.fontSize.sm,
                color: tokens.colors.status.error,
                margin: 0,
                lineHeight: '1.4'
              }}>
                {errorMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    ),
    actions: (
      <Button
        onClick={handleTurnOnCamera}
        disabled={isRequesting}
      >
        {isRequesting ? 'Requesting access...' : errorMessage ? 'Try Again' : 'Turn on camera'}
      </Button>
    ),
    onBack
  };
}

export default VideoAccess;
