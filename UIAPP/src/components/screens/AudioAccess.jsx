/**
 * AudioAccess.jsx
 * ---------------
 * Permission request screen for microphone access.
 * Shown before AudioTest screen when microphone permission not yet granted.
 * Provides context to user about why permission is needed.
 *
 * IMPROVEMENTS:
 * - Inline error handling (no alert())
 * - Timeout handling (60 second limit)
 * - User-friendly error messages with actionable guidance
 * - Stateless screen object pattern (no hooks - matches AudioTest/VideoTest)
 *
 * Flow:
 * 1. User sees explanation of why microphone access is needed
 * 2. User clicks "Turn on microphone" button
 * 3. Button triggers browser permission prompt via getUserMedia
 * 4. On success: navigate to AudioTest screen
 * 5. On failure: show inline error with actionable guidance
 *
 * Props:
 * - onPermissionGranted: Handler called when permission successfully granted (receives stream)
 * - onPermissionDenied: Handler called when permission denied (receives error)
 * - onBack: Handler for back navigation
 * - errorMessage: Current error message (managed by parent)
 * - isRequesting: Whether permission request is in progress (managed by parent)
 *
 * Returns standard screen format:
 * - bannerContent: "Microphone access" header
 * - content: Icon, explanation text, and error messages
 * - actions: "Turn on microphone" or "Try Again" button
 */

import React from 'react';
import { FaMicrophoneAlt } from 'react-icons/fa';
import { Button } from '../ui';
import { useTokens } from '../../theme/TokenProvider';
import { debugService } from '../../utils/DebugService';

function AudioAccess({ onPermissionGranted, onPermissionDenied, onBack, errorMessage, isRequesting }) {
  const { tokens } = useTokens();

  const handleTurnOnMicrophone = async () => {
    // Timeout promise: fail if user doesn't respond in 60 seconds
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 60000)
    );

    try {
      // Request microphone permission via getUserMedia with timeout
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        timeoutPromise
      ]);

      // TAG IT - Mark source for leak detection
      stream._debugTag = 'AudioAccess_Permission';
      debugService.trackStream(stream);
      debugService.log('HARDWARE', 'AudioAccess: Permission stream created', stream);

      console.log('[AudioAccess] Microphone permission GRANTED');

      // Permission granted - call success handler with stream
      onPermissionGranted(stream);
    } catch (error) {
      console.error('[AudioAccess] Microphone permission DENIED or ERROR');
      console.error('[AudioAccess] Error details:', {
        name: error.name,
        message: error.message
      });

      // Map error to user-friendly message with actionable guidance
      let message = 'Microphone access was denied.';

      if (error.message === 'TIMEOUT') {
        message = 'Permission request timed out. Please try again and respond to your browser\'s permission prompt.';
      } else if (error.name === 'NotAllowedError') {
        message = 'Microphone access was denied. Please click "Allow" when your browser asks for permission.';
      } else if (error.name === 'NotFoundError') {
        message = 'No microphone detected. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        message = 'Microphone is already in use by another application. Please close other apps and try again.';
      } else if (error.name === 'OverconstrainedError') {
        message = 'Microphone configuration error. Please try again or use a different microphone.';
      } else if (error.name === 'SecurityError') {
        message = 'Microphone access blocked for security reasons. Please check your browser settings.';
      }

      // Permission denied - call error handler with message
      onPermissionDenied(error, message);
    }
  };

  return {
    bannerContent: 'Microphone access',
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
          {/* Microphone Icon */}
          <FaMicrophoneAlt size={85} color="rgba(44, 47, 72, 0.85)" />

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
              Please allow microphone access on your device
            </p>
            <p style={{
              fontSize: tokens.fontSize.base,
              fontWeight: tokens.fontWeight.normal,
              color: tokens.colors.primary.DEFAULT,
              margin: 0,
              lineHeight: '1.5'
            }}>
              To record your stories, we need temporary access to your microphone.
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
        onClick={handleTurnOnMicrophone}
        disabled={isRequesting}
      >
        {isRequesting ? 'Requesting access...' : errorMessage ? 'Try Again' : 'Turn on microphone'}
      </Button>
    ),
    onBack
  };
}

export default AudioAccess;
