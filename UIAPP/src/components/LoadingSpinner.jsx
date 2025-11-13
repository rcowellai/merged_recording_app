/**
 * LoadingSpinner.jsx
 * ------------------
 * Reusable loading spinner component with design system integration.
 * Used for session validation and async operations.
 *
 * Features:
 * - Token-based styling for consistency
 * - Configurable size (small, medium, large)
 * - Customizable message
 * - Smooth CSS animations
 * - Responsive design
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTokens } from '../theme/TokenProvider';

const LoadingSpinner = ({
  message = 'Loading...',
  size = 'medium',
  centered = true
}) => {
  const { tokens } = useTokens();

  // Size configurations (spinner diameter)
  const sizeConfig = {
    small: '32px',
    medium: '48px',
    large: '64px'
  };

  // Border thickness scales with size
  const borderConfig = {
    small: '3px',
    medium: '4px',
    large: '5px'
  };

  const spinnerSize = sizeConfig[size];
  const borderWidth = borderConfig[size];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: centered ? 'center' : 'flex-start',
      gap: tokens.spacing[4],
      minHeight: centered ? '100dvh' : 'auto',
      padding: tokens.spacing[6],
      backgroundColor: tokens.colors.neutral.DEFAULT
    }}>
      {/* Spinner */}
      <div
        className="loading-spinner-rotate"
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `${borderWidth} solid ${tokens.colors.neutral.gray['02']}`,
          borderTop: `${borderWidth} solid ${tokens.colors.primary.DEFAULT}`,
          borderRadius: '50%',
          animation: 'spinner-rotate 0.8s linear infinite'
        }}
      />

      {/* Message */}
      {message && (
        <p style={{
          color: tokens.colors.neutral.gray['03'],
          fontSize: tokens.fontSize.base,
          fontWeight: tokens.fontWeight.normal,
          textAlign: 'center',
          margin: 0
        }}>
          {message}
        </p>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes spinner-rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

LoadingSpinner.propTypes = {
  message: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  centered: PropTypes.bool
};

export default LoadingSpinner;
