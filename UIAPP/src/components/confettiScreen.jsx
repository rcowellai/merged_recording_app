/**
 * confettiScreen.jsx
 * ------------------
 * A celebration screen that displays confetti and
 * provides a link to view the uploaded recording.
 * Shows after successful upload.
 */

import React from 'react';
import PropTypes from 'prop-types';
import Confetti from 'react-confetti';
import { useTokens } from '../theme/TokenProvider';
import { useBreakpoint } from '../hooks/useBreakpoint';

function ConfettiScreen({ docId }) {
  const { tokens } = useTokens();
  const { isMobile } = useBreakpoint();

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
      backgroundColor: tokens.colors.neutral.default,
      overflow: 'hidden'
    }}>
      <Confetti
        gravity={0.05}
        wind={0.005}
        initialVelocityY={1}
        numberOfPieces={120}
      />

      <div style={{
        textAlign: 'center',
        zIndex: 1,
        padding: tokens.spacing[6]
      }}>
        <div style={{
          fontSize: isMobile ? tokens.fontSize['3xl'] : tokens.fontSize['4xl'],
          fontWeight: tokens.fontWeight.bold,
          color: tokens.colors.primary.DEFAULT,
          marginBottom: tokens.spacing[6]
        }}>
          Memory Saved
        </div>
        <div style={{
          fontSize: isMobile ? tokens.fontSize.lg : tokens.fontSize.xl,
          fontWeight: tokens.fontWeight.normal,
          color: tokens.colors.primary.DEFAULT,
          marginBottom: tokens.spacing[4],
          lineHeight: 1.6
        }}>
          Your story is being crafted
        </div>
        <div style={{
          fontSize: isMobile ? tokens.fontSize.lg : tokens.fontSize.xl,
          fontWeight: tokens.fontWeight.normal,
          color: tokens.colors.primary.DEFAULT,
          lineHeight: 1.6
        }}>
          It will be available to read in the 'My Stories' section shortly.
        </div>
      </div>
    </div>
  );
}

ConfettiScreen.propTypes = {
  docId: PropTypes.string.isRequired
};

export default ConfettiScreen;