/**
 * ErrorScreen.jsx
 * ---------------
 * Error screen component for upload failures
 * Shows user-friendly error message with retry option
 */

import React from 'react';
import { useTokens } from '../theme/TokenProvider';
import wifiDiedIcon from '../Assets/wifi_died.svg';

const ErrorScreen = ({ errorMessage, onRetry, onCancel }) => {
  const { tokens } = useTokens();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#ffffff',
      textAlign: 'center',
      overflow: 'auto'
    }}>
      <div style={{ maxWidth: '400px' }}>
        {/* Icon */}
        <div style={{
          marginBottom: '24px'
        }}>
          <img src={wifiDiedIcon} alt="Connection Error" style={{ width: '180px', height: 'auto' }} />
        </div>

        {/* Header - Section A2 tokens */}
        <h1 style={{
          fontSize: tokens.fontSize['2xl'],
          fontWeight: tokens.fontWeight.normal,
          color: tokens.colors.primary.DEFAULT,
          marginBottom: '16px'
        }}>
          Upload Failed
        </h1>

        {/* Message - Section B tokens */}
        <p style={{
          fontSize: tokens.fontSize.base,
          fontWeight: tokens.fontWeight.normal,
          color: tokens.colors.primary.DEFAULT,
          marginBottom: '32px',
          lineHeight: 1.6
        }}>
          We have been unable to upload your memory. Please check your network connection and try again
        </p>

        {/* Actions - Section C tokens */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={onRetry}
            style={{
              height: '40px',
              padding: `0 ${tokens.spacing[6]}`,
              backgroundColor: tokens.colors.primary.DEFAULT,
              color: tokens.colors.primary.foreground,
              border: 'none',
              borderRadius: tokens.borderRadius.lg,
              fontSize: tokens.fontSize.base,
              fontWeight: tokens.fontWeight.medium,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              fontFamily: tokens.fonts.primary,
              width: '48%'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = tokens.colors.primary.darker}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = tokens.colors.primary.DEFAULT}
          >
            Try Again
          </button>

          <button
            onClick={onCancel}
            style={{
              height: '40px',
              padding: `0 ${tokens.spacing[6]}`,
              backgroundColor: tokens.colors.button.leftHandButton,
              color: tokens.colors.primary.DEFAULT,
              border: `0.5px solid ${tokens.colors.onboarding.fontColor}`,
              borderRadius: tokens.borderRadius.lg,
              fontSize: tokens.fontSize.base,
              fontWeight: tokens.fontWeight.medium,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              fontFamily: tokens.fonts.primary,
              width: '48%'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.accent.DEFAULT;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.button.leftHandButton;
            }}
          >
            Start Over
          </button>
        </div>

        {/* Support link */}
        <div style={{
          marginTop: '40px',
          fontSize: tokens.fontSize.sm,
          color: tokens.colors.primary.DEFAULT,
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