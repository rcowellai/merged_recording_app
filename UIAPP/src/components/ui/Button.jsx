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
 * - large: 80px height mobile, 72px desktop/tablet (10% reduction)
 * - medium: 60px height mobile, 54px desktop/tablet (10% reduction)
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
  // Solid color variants use 'bg' property
  // Gradient variants use 'background' property (for linear-gradient support)
  const variants = {
    primary: {
      bg: tokens.colors.primary.DEFAULT,
      hoverBg: tokens.colors.primary.darker,
      activeBg: tokens.colors.primary.darker,
      color: tokens.colors.primary.foreground,
      fontWeight: tokens.fontWeight.medium
    },
    'primary-gradient': {
      background: tokens.gradients.primary,
      hoverBg: tokens.colors.primary.darker, // Fallback to solid on hover
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
    'subtle-gradient': {
      background: tokens.gradients.subtle,
      hoverBg: tokens.colors.neutral.gray['02'],
      activeBg: tokens.colors.neutral.gray['02'],
      color: tokens.colors.primary.DEFAULT,
      fontWeight: tokens.fontWeight.medium
    },
    'accent-gradient': {
      background: tokens.gradients.accent,
      hoverBg: tokens.colors.clay.DEFAULT,
      activeBg: tokens.colors.clay.DEFAULT,
      color: tokens.colors.primary.foreground,
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

  // Size configurations (10% smaller on desktop/tablet)
  const sizes = {
    large: {
      height: isMobile ? '80px' : '72px', // 10% reduction for desktop/tablet
      fontSize: tokens.fontSize.base,
      padding: `0 ${tokens.spacing[6]}`
    },
    medium: {
      height: isMobile ? '60px' : '54px', // 10% reduction for desktop/tablet
      fontSize: tokens.fontSize.base,
      padding: `0 ${tokens.spacing[5]}`
    }
  };

  const variantStyle = variants[variant];
  const sizeStyle = sizes[size];

  // Determine if variant uses gradient or solid color
  const isGradientVariant = variantStyle.background !== undefined;

  // Build background style based on variant type
  const backgroundStyle = disabled
    ? { backgroundColor: tokens.colors.neutral.gray['02'] }
    : isHovered
    ? { backgroundColor: variantStyle.hoverBg }
    : isGradientVariant
    ? { background: variantStyle.background }
    : { backgroundColor: variantStyle.bg };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...sizeStyle,
        width: fullWidth ? '100%' : 'auto',
        maxWidth: '100%',
        ...backgroundStyle,
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
        boxSizing: 'border-box',
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}
