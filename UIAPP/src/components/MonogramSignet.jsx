/**
 * MonogramSignet.jsx
 * ------------------
 * Glass morphism monogram signet component with dual initials
 *
 * Features:
 * - 140px circular glass effect container (120px on mobile)
 * - Backdrop blur with semi-transparent white background
 * - Dual initials in Cormorant Garamond italic
 * - Floating animation (6s infinite)
 * - Slide-up entrance animation
 */

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTokens } from '../theme/TokenProvider';
import { useBreakpoint } from '../hooks/useBreakpoint';

function MonogramSignet({ initials, animationDelay = 0 }) {
  const { tokens } = useTokens();
  const { isMobile } = useBreakpoint();

  // Inject keyframe animations
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.id = 'monogram-animations';

    // Only add if not already present
    if (!document.getElementById('monogram-animations')) {
      styleTag.textContent = `
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `;
      document.head.appendChild(styleTag);
    }

    return () => {
      const existingTag = document.getElementById('monogram-animations');
      if (existingTag) {
        document.head.removeChild(existingTag);
      }
    };
  }, []);

  const size = isMobile ? 120 : 140;
  const fontSize = isMobile ? '3rem' : '3.5rem';

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        margin: isMobile ? '0 auto 2rem auto' : '0 auto 3rem auto',
        borderRadius: '50%',

        // Glass Effect
        background: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)', // Safari support
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: `
          0 10px 30px rgba(44, 47, 72, 0.05),
          inset 0 0 20px rgba(255, 255, 255, 0.5)
        `,

        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',

        // Animations
        opacity: 0,
        animation: `
          slideUp 1s ${animationDelay}s cubic-bezier(0.2, 0.8, 0.2, 1) forwards,
          float 6s ease-in-out infinite
        `,
        animationDelay: `${animationDelay}s, ${animationDelay}s`
      }}
    >
      <span
        style={{
          fontFamily: tokens.fonts.secondary,
          fontSize: fontSize,
          color: tokens.colors.clay.DEFAULT,
          fontStyle: 'italic',
          fontWeight: tokens.fontWeight.medium,
          lineHeight: 1,
          paddingTop: '6px',
          letterSpacing: '-0.05em'
        }}
      >
        {initials}
      </span>
    </div>
  );
}

MonogramSignet.propTypes = {
  initials: PropTypes.string.isRequired,
  animationDelay: PropTypes.number
};

export default MonogramSignet;
