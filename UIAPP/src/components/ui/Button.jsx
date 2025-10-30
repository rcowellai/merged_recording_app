/**
 * Button.jsx
 * ----------
 * Reusable button component with token-based styling.
 * Replaces all button CSS classes with inline styles.
 *
 * Variants:
 * - primary: Main action button (default)
 * - secondary: Secondary action button
 * - success: Green success/record button
 *
 * Sizes:
 * - large: 80px height (default)
 * - medium: 60px height
 */

import React, { useState } from 'react';
import { useTokens } from '../../theme/TokenProvider';
import { useBreakpoint } from '../../hooks/useBreakpoint';

export function Button({
  children,
  variant = 'primary',
  size = 'large',
  onClick,
  disabled = false,
  fullWidth = true,
  style = {},
  type = 'button',
  ...props
}) {
  const { tokens } = useTokens();
  const { isMobile } = useBreakpoint();
  const [isHovered, setIsHovered] = useState(false);

  // Variant color configurations
  const variants = {
    primary: {
      bg: tokens.colors.primary.DEFAULT,
      hoverBg: tokens.colors.primary.darker,
      activeBg: tokens.colors.primary.darker,
      color: tokens.colors.primary.foreground,
      fontWeight: tokens.fontWeight.medium
    },
    secondary: {
      bg: tokens.colors.accent.DEFAULT,
      hoverBg: tokens.colors.accent.DEFAULT,
      activeBg: tokens.colors.accent.DEFAULT,
      color: tokens.colors.accent.foreground,
      fontWeight: tokens.fontWeight.medium
    },
    success: {
      bg: tokens.colors.status.success,
      hoverBg: tokens.colors.status.success,
      activeBg: tokens.colors.status.success,
      color: tokens.colors.primary.foreground,
      fontWeight: tokens.fontWeight.medium
    }
  };

  // Size configurations
  const sizes = {
    large: {
      height: '80px',
      fontSize: tokens.fontSize.base,
      padding: `0 ${tokens.spacing[6]}`
    },
    medium: {
      height: '60px',
      fontSize: tokens.fontSize.base,
      padding: `0 ${tokens.spacing[5]}`
    }
  };

  const variantStyle = variants[variant];
  const sizeStyle = sizes[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...sizeStyle,
        width: fullWidth ? (isMobile ? '100%' : '540px') : 'auto',
        backgroundColor: disabled
          ? tokens.colors.neutral.gray['02']
          : isHovered
          ? variantStyle.hoverBg
          : variantStyle.bg,
        color: disabled ? tokens.colors.neutral.gray['01'] : variantStyle.color,
        fontWeight: variantStyle.fontWeight,
        border: 'none',
        borderRadius: tokens.borderRadius.lg,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s ease',
        fontFamily: tokens.fonts.primary,
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}
