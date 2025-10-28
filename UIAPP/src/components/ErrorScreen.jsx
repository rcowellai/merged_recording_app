/**
 * ErrorScreen.jsx
 * ---------------
 * Error screen component for upload failures
 * Shows user-friendly error message with retry option
 */

import React from 'react';
import { FaExclamationTriangle, FaUndo, FaTimes } from 'react-icons/fa';
import { Button, ButtonRow } from './ui';
import { useTokens } from '../theme/TokenProvider';

const ErrorScreen = ({ errorMessage, onRetry, onCancel }) => {
  const { tokens } = useTokens();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: tokens.zIndex.overlay
    }}>
      <div style={{
        backgroundColor: tokens.colors.background.light,
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing[8],
        maxWidth: '480px',
        width: '90%',
        boxShadow: tokens.shadows.xl,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: tokens.spacing[6]
      }}>
        <div>
          <FaExclamationTriangle size={64} color={tokens.colors.status.error} />
        </div>

        <div style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing[2]
        }}>
          <h2 style={{
            fontSize: tokens.fontSize['2xl'],
            fontWeight: tokens.fontWeight.bold,
            color: tokens.colors.neutral.black,
            margin: 0
          }}>
            Upload Failed
          </h2>
          <p style={{
            fontSize: tokens.fontSize.base,
            color: tokens.colors.neutral.gray['01'],
            margin: 0,
            lineHeight: 1.5
          }}>
            {errorMessage || 'Something went wrong during upload. Please try again.'}
          </p>
        </div>

        <div style={{ width: '100%' }}>
          <ButtonRow>
            <Button
              variant="secondary"
              onClick={onCancel}
              style={{
                width: '48%',
                backgroundColor: tokens.colors.button.leftHandButton,
                border: `0.5px solid ${tokens.colors.onboarding.fontColor}`,
                color: tokens.colors.accent.foreground
              }}
              fullWidth={false}
            >
              <FaTimes style={{ marginRight: tokens.spacing[2] }} />
              Start Over
            </Button>
            <Button
              onClick={onRetry}
              style={{ width: '48%' }}
              fullWidth={false}
            >
              <FaUndo style={{ marginRight: tokens.spacing[2] }} />
              Try Again
            </Button>
          </ButtonRow>
        </div>

        <div style={{
          fontSize: tokens.fontSize.sm,
          color: tokens.colors.neutral.gray['01'],
          textAlign: 'center'
        }}>
          <p style={{ margin: 0 }}>
            If this problem persists, please{' '}
            <a
              href="https://loveretold.com/support"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: tokens.colors.accent.interactive,
                textDecoration: 'underline'
              }}
            >
              contact support
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;