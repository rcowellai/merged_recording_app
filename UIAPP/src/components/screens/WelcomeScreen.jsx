/**
 * WelcomeScreen.jsx
 * -----------------
 * Monogram-style welcome screen with glass morphism effects
 *
 * Features:
 * - Dual-initial monogram signet (glass effect)
 * - Love: Retold logo at top
 * - Ambient floor glow effect
 * - SVG texture overlay
 * - Staggered slide-up animations
 * - Two-line italic main title
 * - Continue button in MasterLayout actions section
 *
 * Design: Warm cream background (#F9F8F6) with sophisticated serif typography
 *
 * NOTE: This is a FACTORY FUNCTION, not a React component.
 * It does NOT use hooks - all values must be passed as parameters.
 */

import React, { useEffect } from 'react';
import { Button } from '../ui';
import { extractInitials } from '../../utils/nameUtils';
import { ReactComponent as LoveRetoldLogo } from '../../Assets/Name_only.svg';

/**
 * AnimatedText Component
 * Handles staggered slide-up animation for text elements
 */
function AnimatedText({ children, delay = 0, fontSize, fontWeight, fontFamily, color, textAlign = 'center', marginBottom, className = '', style = {} }) {
  const baseStyle = {
    fontSize,
    fontWeight,
    fontFamily,
    color,
    textAlign,
    marginBottom,
    opacity: 0,
    animation: `slideUp 1s ${delay}s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
    ...style
  };

  return (
    <div className={className} style={baseStyle}>
      {children}
    </div>
  );
}

/**
 * MonogramSignet Component (moved inline to avoid hook issues)
 * Glass morphism monogram signet with dual initials
 */
function MonogramSignet({ initials, animationDelay = 0, tokens, isMobile }) {
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
        margin: isMobile ? '1rem auto 4rem auto' : '4rem auto 5rem auto',
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

/**
 * EffectInjector Component
 * Injects global animations and effects when rendered
 */
function EffectInjector() {
  useEffect(() => {
    // Add slideUp animation if not already present
    if (!document.getElementById('welcome-animations')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'welcome-animations';
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

        /* SVG Texture Overlay */
        body::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
        }

        /* Ambient Floor Glow */
        body::after {
          content: '';
          position: fixed;
          bottom: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: 150vw;
          height: 60vh;
          background: radial-gradient(ellipse at center, #E6E0D5 0%, rgba(249, 248, 246, 0) 70%);
          z-index: 1;
          pointer-events: none;
        }

        /* Ensure content is above effects */
        .page-container-welcome {
          position: relative;
          z-index: 10;
        }
      `;
      document.head.appendChild(styleTag);
    }

    return () => {
      const styleTag = document.getElementById('welcome-animations');
      if (styleTag) {
        document.head.removeChild(styleTag);
      }
    };
  }, []);

  return null;
}

/**
 * WelcomeScreen Factory Function
 * IMPORTANT: This is NOT a React component - it's a factory function.
 * It must NOT use hooks. All values must be passed as parameters.
 *
 * @param {Object} params
 * @param {Object} params.sessionData - Session data
 * @param {Function} params.onContinue - Continue callback
 * @param {Object} params.tokens - Design tokens from TokenProvider
 * @param {boolean} params.isMobile - Mobile breakpoint flag
 */
function WelcomeScreen({ sessionData, onContinue, tokens, isMobile }) {
  // Extract askerName using same logic as original
  const askerName = sessionData?.sessionData?.askerName ||
                    sessionData?.session?.askerName ||
                    sessionData?.askerName ||
                    sessionData?.sessionData?.storytellerName ||
                    sessionData?.session?.storytellerName ||
                    sessionData?.storytellerName ||
                    'Unknown';

  // Extract initials for monogram
  const initials = extractInitials(askerName);

  return {
    timer: null,
    content: (
      <>
        <EffectInjector />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          width: '100%',
          padding: isMobile ? tokens.spacing[4] : tokens.spacing[8],
          position: 'relative',
          zIndex: 10
        }}>
          {/* Love: Retold Logo */}
          <div style={{
            width: isMobile ? '200px' : '250px',
            marginBottom: isMobile ? tokens.spacing[8] : tokens.spacing[10],
            opacity: 0,
            animation: 'slideUp 1s 0s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
          }}>
            <LoveRetoldLogo style={{ width: '100%', height: 'auto' }} />
          </div>

          {/* Monogram Signet */}
          <MonogramSignet initials={initials} animationDelay={0.1} tokens={tokens} isMobile={isMobile} />

          {/* Greeting Label */}
          <AnimatedText
            delay={0.2}
            fontSize={tokens.fontSize.sm}
            fontWeight={tokens.fontWeight.medium}
            fontFamily={tokens.fonts.primary}
            color={tokens.colors.neutral.gray['04']}
            textAlign="center"
            marginBottom={tokens.spacing[4]}
            style={{
              letterSpacing: '0.2em',
              textTransform: 'uppercase'
            }}
          >
            Welcome, {askerName}
          </AnimatedText>

          {/* Main Title */}
          <AnimatedText
            delay={0.3}
            fontSize={isMobile ? tokens.fontSize['3xl'] : tokens.fontSize['4xl']}
            fontWeight={tokens.fontWeight.medium}
            fontFamily={tokens.fonts.secondary}
            color={tokens.colors.primary.DEFAULT}
            textAlign="center"
            marginBottom={isMobile ? 0 : tokens.spacing[8]}
            style={{
              lineHeight: 1.1
            }}
          >
            It's time to share<br />
            <span style={{ fontStyle: 'italic' }}>another memory.</span>
          </AnimatedText>
        </div>
      </>
    ),
    actions: (
      <Button
        onClick={onContinue}
        className="welcome-button"
        style={{
          backgroundColor: tokens.colors.primary.DEFAULT,
          color: tokens.colors.primary.foreground,
          height: '56px',
          padding: `0 ${tokens.spacing[10]}`,
          borderRadius: '56px',
          fontSize: tokens.fontSize.base,
          fontWeight: tokens.fontWeight.medium,
          border: 'none',
          boxShadow: '0 10px 30px rgba(44, 47, 72, 0.15)',
          transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: tokens.spacing[3],
          opacity: 0,
          animation: 'slideUp 1s 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
          width: isMobile ? '100%' : 'auto',
          maxWidth: '100%',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#383B56';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 15px 40px rgba(44, 47, 72, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = tokens.colors.primary.DEFAULT;
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(44, 47, 72, 0.15)';
        }}
      >
        Begin Session
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </Button>
    ),
    showBackButton: false,
    showBanner: !isMobile
  };
}

export default WelcomeScreen;
