/**
 * SessionErrorScreen.jsx
 * ----------------------
 * Session validation error screen component
 * Displays user-friendly error messages for session validation failures
 *
 * PURPOSE:
 * Provides consistent error screens for session validation issues.
 * Handles three error types: invalid link, expired link, and network issues.
 *
 * ERROR TYPES:
 * - 'invalid': Invalid/missing/corrupted recording link
 * - 'expired': Link has expired or been revoked
 * - 'network': Network/Firebase connection issues
 *
 * INTEGRATION:
 * - Uses TokenProvider for consistent styling
 * - Follows ProductionErrorScreen pattern (full-screen white background)
 */

import React from 'react';
import { useTokens } from '../theme/TokenProvider';
import error404Icon from '../Assets/error_404.svg';
import expiredLinkIcon from '../Assets/expired_link.svg';
import wifiDiedIcon from '../Assets/wifi_died.svg';

const SessionErrorScreen = ({
  errorType = 'invalid',
  onRetry,
  onGoHome
}) => {
  const { tokens } = useTokens();

  // Error content mapping
  const errorContent = {
    invalid: {
      icon: error404Icon,
      iconAlt: 'Invalid Link',
      header: 'Invalid Recording Link',
      message: ['This recording link appears to be incomplete or corrupted.', 'Please check that you copied the entire link from your email.']
    },
    expired: {
      icon: expiredLinkIcon,
      iconAlt: 'Expired Link',
      header: 'Link Expired',
      message: ['This recording link is no longer valid or has expired.', 'Please request a new recording link or contact support for assistance.']
    },
    network: {
      icon: wifiDiedIcon,
      iconAlt: 'Connection Error',
      header: 'Connection Issue',
      message: ['We were unable to verify your recording link.', 'Please check your network connection and try again.']
    }
  };

  const content = errorContent[errorType] || errorContent.invalid;

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
          <img src={content.icon} alt={content.iconAlt} style={{ width: '180px', height: 'auto' }} />
        </div>

        {/* Header - Section A2 tokens */}
        <h1 style={{
          fontSize: tokens.fontSize['2xl'],
          fontWeight: tokens.fontWeight.normal,
          color: tokens.colors.primary.DEFAULT,
          marginBottom: '16px'
        }}>
          {content.header}
        </h1>

        {/* Message - Section B tokens */}
        {Array.isArray(content.message) ? (
          <div style={{ marginBottom: '32px' }}>
            {content.message.map((text, index) => (
              <p key={index} style={{
                fontSize: tokens.fontSize.lg,
                fontWeight: tokens.fontWeight.normal,
                color: tokens.colors.primary.DEFAULT,
                marginBottom: index < content.message.length - 1 ? '16px' : '0',
                lineHeight: 1.6
              }}>
                {text}
              </p>
            ))}
          </div>
        ) : (
          <p style={{
            fontSize: tokens.fontSize.lg,
            fontWeight: tokens.fontWeight.normal,
            color: tokens.colors.primary.DEFAULT,
            marginBottom: '32px',
            lineHeight: 1.6
          }}>
            {content.message}
          </p>
        )}

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
              width: '100%',
              maxWidth: '300px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = tokens.colors.primary.darker}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = tokens.colors.primary.DEFAULT}
          >
            Try Again
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
            Need help?{' '}
            <a
              href="https://loveretold.com/support"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: tokens.colors.accent.interactive,
                textDecoration: 'underline'
              }}
            >
              Contact support
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionErrorScreen;
