/**
 * ProductionErrorScreen.jsx
 * -------------------------
 * Generic error screen for production
 * Used by both AppErrorBoundary and FirebaseErrorBoundary
 *
 * PURPOSE:
 * Provides a user-friendly, non-technical error screen for production users.
 * Hides stack traces and technical details while maintaining error tracking.
 *
 * FEATURES:
 * - Generic "Something went wrong" messaging
 * - Clear recovery actions (Try Again, Go Home)
 * - Error ID for support correlation
 * - Professional, calm visual design
 * - No information disclosure
 *
 * USED BY:
 * - AppErrorBoundary (catastrophic React errors)
 * - FirebaseErrorBoundary (Firebase service failures)
 *
 * INTEGRATION:
 * - Uses TokenProvider for consistent styling
 * - Environment-aware (only shown when NODE_ENV === 'production')
 */

import React from 'react';
import { useTokens } from '../theme/TokenProvider';
import error404Icon from '../Assets/error_404.svg';

const ProductionErrorScreen = ({
  errorId,
  onRetry,
  onGoHome,
  showRetry = true
}) => {
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
        {/* Icon - Friendly, not alarming */}
        <div style={{
          marginBottom: '24px'
        }}>
          <img src={error404Icon} alt="Error" style={{ width: '120px', height: 'auto' }} />
        </div>

        {/* Title - Simple, non-technical */}
        <h1 style={{
          fontSize: tokens.fontSize['2xl'],
          fontWeight: tokens.fontWeight.normal,
          color: tokens.colors.primary.DEFAULT,
          marginBottom: '16px'
        }}>
          Something went wrong
        </h1>

        {/* Message - Reassuring, not blaming */}
        <p style={{
          fontSize: tokens.fontSize.base,
          fontWeight: tokens.fontWeight.normal,
          color: tokens.colors.primary.DEFAULT,
          marginBottom: '32px',
          lineHeight: 1.6
        }}>
          We're sorry for the inconvenience. Our team has been notified and is working on it.
        </p>

        {/* Actions - Clear recovery path */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {showRetry && (
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
          )}

          <button
            onClick={onGoHome}
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
            Go Home
          </button>
        </div>

        {/* Error ID - Small, unobtrusive, for support */}
        {errorId && (
          <div style={{
            marginTop: '40px',
            paddingTop: '24px',
            borderTop: `1px solid ${tokens.colors.border.DEFAULT}`,
            fontSize: tokens.fontSize.sm,
            color: tokens.colors.text.tertiary
          }}>
            <div>Error ID: {errorId}</div>
            <div style={{
              marginTop: '8px',
              fontSize: tokens.fontSize.xs
            }}>
              Reference this ID when contacting support
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionErrorScreen;
