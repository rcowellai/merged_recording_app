/**
 * GlobalStyles.jsx
 * Minimal global CSS resets and base styles.
 * Applied once at app root level.
 */
import React, { useEffect } from 'react';
import { useTokens } from './TokenProvider';

export const GlobalStyles = () => {
  const { tokens } = useTokens();

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* CSS Reset */
      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      html {
        font-size: 16px;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      body {
        margin: 0;
        padding: 0;
        font-family: ${tokens.fonts.primary};
        font-size: ${tokens.fontSize.base};
        color: ${tokens.colors.neutral.black};
        background-color: ${tokens.colors.neutral.default};
        min-height: 100vh;
        min-height: 100dvh;
      }

      /* Global Focus Styles */
      *:focus-visible {
        outline: 2px solid ${tokens.colors.primary.DEFAULT};
        outline-offset: 2px;
      }

      *:focus:not(:focus-visible) {
        outline: none;
      }

      /* Button Reset */
      button {
        font-family: inherit;
      }

      /* Remove focus rings from buttons */
      button:focus,
      button:focus-visible {
        outline: none;
      }

      /* Image Defaults */
      img {
        max-width: 100%;
        height: auto;
      }

      /* Animations */
      @keyframes bounce {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-8px);
        }
      }

      /* Welcome Screen Button Gradient - Desktop/Tablet Only */
      @media (min-width: 768px) {
        .welcome-button {
          background: linear-gradient(to top, #2C2F48, #403852, #4A4C6B) !important;
        }
      }
    `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [tokens]);

  return null;
};
