/**
 * TokenProvider.jsx
 * -----------------
 * Central design token management system for the Recording App.
 * Provides theme context and manages CSS custom properties dynamically.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
// import { COLORS, LAYOUT } from '../config'; // Reserved for future use

// Default design tokens (preserving current design exactly)
const DEFAULT_TOKENS = {
  fonts: {
    primary: "'Open Sans', sans-serif",
    weights: {
      normal: 400,
      medium: 525,
      semibold: 500
    }
  },
  colors: {
    primary: {
      bg: '#F5F4F0',
      text: '#333333'
    },
    secondary: {
      bg: '#E4E2D8',
      text: '#2C2F48'
    },
    accent: {
      bg: '#2C2F48',
      text: '#F5F4F0'
    },
    card: {
      bg: '#FFFFFF',
      text: '#333333'
    },
    recording: '#B3261E',
    inactive: '#999999',
    textGray: '#666666'
  },
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '30px',
    xxl: '40px',
    xxxl: '60px'
  },
  layout: {
    maxWidth: '480px',
    containerPadding: '24px 16px',
    borderRadius: '8px',
    cardBorderRadius: '12px'
  },
  banner: {
    height: '100px',
    zIndex: 998,
    backgroundColor: '#2C2F48',
    textColor: '#F5F4F0',
    enabled: true
  },
  shadows: {
    card: '0 0 10px rgba(0,0,0,0.1)',
    overlay: '0 0 25px rgba(0,0,0,0.2)'
  }
};

// Storage key for persisting tokens
const TOKENS_STORAGE_KEY = 'recording_app_design_tokens';

// Token Context
const TokenContext = createContext(null);

/**
 * Hook to access design tokens and update functions
 */
export const useTokens = () => {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useTokens must be used within a TokenProvider');
  }
  return context;
};

/**
 * TokenProvider Component
 * Manages design tokens and updates CSS custom properties
 */
export const TokenProvider = ({ children }) => {
  const [tokens, setTokens] = useState(() => {
    // Load tokens from localStorage or use defaults
    try {
      const stored = localStorage.getItem(TOKENS_STORAGE_KEY);
      return stored ? { ...DEFAULT_TOKENS, ...JSON.parse(stored) } : DEFAULT_TOKENS;
    } catch (error) {
      console.warn('Failed to load stored tokens, using defaults:', error);
      return DEFAULT_TOKENS;
    }
  });

  // Update CSS custom properties when tokens change
  useEffect(() => {
    const root = document.documentElement;
    
    // Update CSS custom properties
    // Fonts
    root.style.setProperty('--font-primary', tokens.fonts.primary);
    root.style.setProperty('--font-weight-normal', tokens.fonts.weights.normal);
    root.style.setProperty('--font-weight-medium', tokens.fonts.weights.medium);
    root.style.setProperty('--font-weight-semibold', tokens.fonts.weights.semibold);
    
    // Colors - Update existing CSS custom properties
    root.style.setProperty('--btn-primary-bg', tokens.colors.accent.bg);
    root.style.setProperty('--btn-primary-color', tokens.colors.accent.text);
    root.style.setProperty('--btn-secondary-bg', tokens.colors.secondary.bg);
    root.style.setProperty('--btn-secondary-color', tokens.colors.secondary.text);
    
    // New token-based properties
    root.style.setProperty('--color-primary-bg', tokens.colors.primary.bg);
    root.style.setProperty('--color-primary-text', tokens.colors.primary.text);
    root.style.setProperty('--color-card-bg', tokens.colors.card.bg);
    root.style.setProperty('--color-card-text', tokens.colors.card.text);
    root.style.setProperty('--color-recording', tokens.colors.recording);
    root.style.setProperty('--color-inactive', tokens.colors.inactive);
    root.style.setProperty('--color-text-gray', tokens.colors.textGray);
    
    // Spacing
    Object.entries(tokens.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });
    
    // Layout
    root.style.setProperty('--layout-max-width', tokens.layout.maxWidth);
    root.style.setProperty('--layout-container-padding', tokens.layout.containerPadding);
    root.style.setProperty('--border-radius', tokens.layout.borderRadius);
    root.style.setProperty('--border-radius-card', tokens.layout.cardBorderRadius);
    
    // Shadows
    root.style.setProperty('--shadow-card', tokens.shadows.card);
    root.style.setProperty('--shadow-overlay', tokens.shadows.overlay);
    
    // Banner system
    root.style.setProperty('--banner-height', tokens.banner.height);
    root.style.setProperty('--banner-z-index', tokens.banner.zIndex);
    root.style.setProperty('--banner-bg', tokens.banner.backgroundColor);
    root.style.setProperty('--banner-text', tokens.banner.textColor);
    
    // Update body styles for font family and banner state
    document.body.style.fontFamily = tokens.fonts.primary;
    document.body.style.backgroundColor = tokens.colors.primary.bg;
    document.body.style.color = tokens.colors.primary.text;
    
    // Toggle banner-active class based on enabled state
    if (tokens.banner.enabled) {
      document.body.classList.add('banner-active');
    } else {
      document.body.classList.remove('banner-active');
    }
  }, [tokens]);

  // Save tokens to localStorage when they change
  const updateTokens = (newTokens) => {
    const updatedTokens = typeof newTokens === 'function' ? newTokens(tokens) : newTokens;
    setTokens(updatedTokens);
    
    try {
      localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(updatedTokens));
    } catch (error) {
      console.warn('Failed to save tokens to localStorage:', error);
    }
  };

  // Reset to defaults
  const resetTokens = () => {
    setTokens(DEFAULT_TOKENS);
    try {
      localStorage.removeItem(TOKENS_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear stored tokens:', error);
    }
  };


  // Export current tokens (for backup/import)
  const exportTokens = () => {
    return JSON.stringify(tokens, null, 2);
  };

  // Import tokens from JSON
  const importTokens = (tokenJson) => {
    try {
      const importedTokens = JSON.parse(tokenJson);
      // Merge with defaults to ensure all required properties exist
      const mergedTokens = { ...DEFAULT_TOKENS, ...importedTokens };
      updateTokens(mergedTokens);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    tokens,
    updateTokens,
    resetTokens,
    exportTokens,
    importTokens,
    defaults: DEFAULT_TOKENS
  };

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  );
};

export default TokenProvider;