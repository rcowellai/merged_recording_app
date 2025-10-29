/**
 * TokenProvider.jsx
 * -----------------
 * Central design token management system for the Recording App.
 * Provides theme context and manages CSS custom properties dynamically.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

// ============================================================
// ==================== NEW TOKENS BEGIN ======================
// ============================================================

const DEFAULT_TOKENS = {
  // Font Family
  fonts: {
    primary: "'Open Sans', sans-serif"
  },

  // Font Size Scale (Tailwind-inspired)
  fontSize: {
    xs: '0.75rem',    // 12px - Small labels, captions
    sm: '0.875rem',   // 14px - Body text (small)
    base: '1rem',     // 16px - Body text (default)
    lg: '1.125rem',   // 18px - Large body text
    xl: '1.25rem',    // 20px - Small headings
    '2xl': '1.5rem',  // 24px - Medium headings
    '3xl': '1.875rem',// 30px - Large headings
    '4xl': '2.25rem', // 36px - Extra large headings
    '5xl': '3rem'     // 48px - Hero text
  },

  // Font Weight Scale
  fontWeight: {
    thin: 100,        // Very thin (rarely used)
    extralight: 200,  // Extra light
    light: 300,       // Light text
    normal: 400,      // Default body text
    medium: 500,      // Emphasized text
    semibold: 600,    // Sub-headings
    bold: 700,        // Headings, strong emphasis
    extrabold: 800,   // Very bold
    black: 900        // Heaviest weight
  },

  // Spacing Scale (Padding/Margin)
  spacing: {
    0: '0',           // 0px
    1: '0.25rem',     // 4px
    2: '0.5rem',      // 8px
    3: '0.75rem',     // 12px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    8: '2rem',        // 32px
    10: '2.5rem',     // 40px
    12: '3rem'        // 48px
  },

  // Border Radius Scale
  borderRadius: {
    none: '0',        // Sharp corners
    sm: '0.125rem',   // 2px - Subtle rounding
    DEFAULT: '0.25rem', // 4px - Default rounding
    md: '0.375rem',   // 6px - Form fields
    lg: '0.5rem',     // 8px - Cards, buttons (most common)
    xl: '0.75rem',    // 12px - Large cards
    '2xl': '1rem',    // 16px - Very rounded
    full: '9999px'    // Circles, pills
  },

  // Color System
  colors: {
    // Primary Colors
    primary: {
      DEFAULT: '#2C2F48',    /* ■ #2C2F48 - Primary brand color - Headings, brand elements */
      foreground: '#FFFFFF', /* ■ #FFFFFF - Text on primary - Text over primary backgrounds */
      darker: '#1c1e33'      /* ■ #1c1e33 - Darkest primary - Active states */
    },

    // Accent Colors
    accent: {
      DEFAULT: '#FBFBF9',    /* ■ #FBFBF9 - Accent color - Highlights, backgrounds */
      foreground: '#2C2F48', /* ■ #2C2F48 - Text on accent - Text over accent backgrounds */
      interactive: '#6366f1' /* ■ #6366f1 - Interactive accent - Links, interactive elements */
    },

    // Status Colors
    status: {
      error: '#72181F',      /* ■ #72181F - Error states - Error messages, validation, destructive actions */
      success: '#3A754B',    /* ■ #3A754B - Success states - Success messages, confirmations */
      pending: '#E2B93B',    /* ■ #E2B93B - Pending states - Pending actions, warnings */
      warning: '#f59e0b',    /* ■ #f59e0b - Warning states - Warning messages */
      danger: '#ef4444',     /* ■ #ef4444 - Danger states - Critical warnings */
      recording_red: '#B72A32',  /* ■ #B72A32 - Recording state - Recording bar background */
      pause_background: '#6A6D6B'  /* ■ #6A6D6B - Paused state - Recording bar paused background */
    },

    // Neutral Colors
    neutral: {
      DEFAULT: '#F5F4F0',    /* ■ #F5F4F0 - Default neutral - Neutral backgrounds */
      black: '#030303',      /* ■ #030303 - True black - Text, dark elements */
      gray: {
        '01': '#BDBDBD',     /* ■ #BDBDBD - Light gray - Subtle text, placeholders */
        '02': '#F5F5F5',     /* ■ #F5F5F5 - Very light gray - Light backgrounds */
        '03': '#4F4F4F'      /* ■ #4F4F4F - Dark gray - Dark text on light */
      }
    },

    // Background Colors
    background: {
      light: '#ffffff',      /* ■ #ffffff - Light background - Main backgrounds */
      promptCard: '#E4E2D8', /* ■ #E4E2D8 - Prompt cards - Prompt selection cards */
      recording: '#1E1F29'   /* ■ #1E1F29 - Recording background - Dark background for active recording */
    },

    // Border Colors
    border: {
      neutral: '#D5D4D1',    /* ■ #D5D4D1 - Neutral borders - Default borders */
      fieldStroke: '#CBD5E0' /* ■ #CBD5E0 - Form fields - Input borders */
    },

    // Specialized Colors
    text: {
      onDark: '#ffffff',     /* ■ #ffffff - Text on dark - Light text on dark bg */
      onDarkSubtle: '#e5e7eb'/* ■ #e5e7eb - Subtle on dark - Muted text on dark */
    },

    onboarding: {
      fontColor: '#718096'   /* ■ #718096 - Onboarding text - Onboarding flows */
    },

    focus: {
      outline: '#F4C7AB'     /* ■ #F4C7AB - Focus outline - Focus indicators */
    },

    avatar: {
      gradient: '#D7BFAE'    /* ■ #D7BFAE - Avatar gradient - Avatar backgrounds */
    },

    icon: {
      light: '#F5F6FA'       /* ■ #F5F6FA - Light icons - Icon fills */
    },

    button: {
      leftHandButton: '#F0EFEB'  /* ■ #F0EFEB - Left hand button - Secondary button background */
    }
  },

  // Shadow Scale
  shadows: {
    none: 'none',                                    // No shadow
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',          // Subtle shadow
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',      // Default shadow
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',        // Medium shadow
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',      // Large shadow - Cards
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',      // Extra large shadow
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 2X large shadow - Overlays
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'  // Inner shadow
  },

  // Z-Index Scale (Stacking Layers)
  zIndex: {
    base: 0,       // Base layer
    dropdown: 10,  // Dropdowns, popovers
    sticky: 20,    // Sticky elements
    overlay: 30,   // Overlays, backdrops
    modal: 40,     // Modals, dialogs
    popover: 50,   // Popovers above modals
    toast: 60      // Toast notifications (top layer)
  },

  // Layout Constraints
  layout: {
    maxWidth: {
      sm: '320px',   // Small mobile
      md: '480px',   // Standard mobile/app
      lg: '768px',   // Tablet
      xl: '1024px',  // Desktop
      '2xl': '1280px' // Wide desktop
    },
    container: {
      padding: '24px 16px',       // Standard container padding
      paddingSm: '16px 12px',     // Small container padding
      paddingLg: '32px 24px'      // Large container padding
    },
    breakpoints: {
      mobile: '768px',    // < 768px = mobile
      tablet: '1024px',   // 768px - 1023px = tablet
      desktop: '1280px'   // >= 1024px = desktop
    }
  }
};

// Storage key for persisting tokens
const TOKENS_STORAGE_KEY = 'recording_app_design_tokens';

// Deep merge utility to properly merge nested objects
const deepMerge = (target, source) => {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }

  return output;
};

const isObject = (item) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

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
      if (stored) {
        const parsedTokens = JSON.parse(stored);
        // Deep merge to preserve nested object structure
        return deepMerge(DEFAULT_TOKENS, parsedTokens);
      }
      return DEFAULT_TOKENS;
    } catch (error) {
      console.warn('Failed to load stored tokens, using defaults:', error);
      return DEFAULT_TOKENS;
    }
  });

  // Update CSS custom properties when tokens change
  useEffect(() => {
    const root = document.documentElement;

    // === Font Family ===
    if (tokens.fonts?.primary) {
      root.style.setProperty('--font-primary', tokens.fonts.primary);
    }

    // === Font Sizes ===
    if (tokens.fontSize) {
      Object.entries(tokens.fontSize).forEach(([key, value]) => {
        root.style.setProperty(`--font-size-${key}`, value);
      });
    }

    // === Font Weights ===
    if (tokens.fontWeight) {
      Object.entries(tokens.fontWeight).forEach(([key, value]) => {
        root.style.setProperty(`--font-weight-${key}`, value);
      });
    }

    // === Spacing ===
    if (tokens.spacing) {
      Object.entries(tokens.spacing).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, value);
      });
    }

    // === Border Radius ===
    if (tokens.borderRadius) {
      Object.entries(tokens.borderRadius).forEach(([key, value]) => {
        const cssKey = key === 'DEFAULT' ? 'default' : key;
        root.style.setProperty(`--border-radius-${cssKey}`, value);
      });
    }

    // === Colors ===
    // Primary colors
    if (tokens.colors?.primary) {
      Object.entries(tokens.colors.primary).forEach(([key, value]) => {
        const cssKey = key === 'DEFAULT' ? 'default' : key;
        root.style.setProperty(`--color-primary-${cssKey}`, value);
      });
    }

    // Accent colors
    if (tokens.colors?.accent) {
      Object.entries(tokens.colors.accent).forEach(([key, value]) => {
        const cssKey = key === 'DEFAULT' ? 'default' : key;
        root.style.setProperty(`--color-accent-${cssKey}`, value);
      });
    }

    // Status colors
    if (tokens.colors?.status) {
      Object.entries(tokens.colors.status).forEach(([key, value]) => {
        root.style.setProperty(`--color-status-${key}`, value);
      });
    }

    // Neutral colors
    if (tokens.colors?.neutral) {
      if (tokens.colors.neutral.DEFAULT) {
        root.style.setProperty('--color-neutral-default', tokens.colors.neutral.DEFAULT);
      }
      if (tokens.colors.neutral.black) {
        root.style.setProperty('--color-neutral-black', tokens.colors.neutral.black);
      }
      if (tokens.colors.neutral.gray) {
        Object.entries(tokens.colors.neutral.gray).forEach(([key, value]) => {
          root.style.setProperty(`--color-neutral-gray-${key}`, value);
        });
      }
    }

    // Background colors
    if (tokens.colors?.background) {
      Object.entries(tokens.colors.background).forEach(([key, value]) => {
        root.style.setProperty(`--color-background-${key}`, value);
      });
    }

    // Border colors
    if (tokens.colors?.border) {
      Object.entries(tokens.colors.border).forEach(([key, value]) => {
        root.style.setProperty(`--color-border-${key}`, value);
      });
    }

    // Specialized colors - text
    if (tokens.colors?.text) {
      Object.entries(tokens.colors.text).forEach(([key, value]) => {
        root.style.setProperty(`--color-text-${key}`, value);
      });
    }

    // Specialized colors - onboarding
    if (tokens.colors?.onboarding?.fontColor) {
      root.style.setProperty('--color-onboarding-font', tokens.colors.onboarding.fontColor);
    }

    // Specialized colors - focus
    if (tokens.colors?.focus?.outline) {
      root.style.setProperty('--color-focus-outline', tokens.colors.focus.outline);
    }

    // Specialized colors - avatar
    if (tokens.colors?.avatar?.gradient) {
      root.style.setProperty('--color-avatar-gradient', tokens.colors.avatar.gradient);
    }

    // Specialized colors - icon
    if (tokens.colors?.icon?.light) {
      root.style.setProperty('--color-icon-light', tokens.colors.icon.light);
    }

    // Specialized colors - button
    if (tokens.colors?.button?.leftHandButton) {
      root.style.setProperty('--color-button-left-hand', tokens.colors.button.leftHandButton);
    }

    // === Shadows ===
    if (tokens.shadows) {
      Object.entries(tokens.shadows).forEach(([key, value]) => {
        const cssKey = key === 'DEFAULT' ? 'default' : key;
        root.style.setProperty(`--shadow-${cssKey}`, value);
      });
    }

    // === Z-Index ===
    if (tokens.zIndex) {
      Object.entries(tokens.zIndex).forEach(([key, value]) => {
        root.style.setProperty(`--z-index-${key}`, value);
      });
    }

    // === Layout - Max Width ===
    if (tokens.layout?.maxWidth) {
      Object.entries(tokens.layout.maxWidth).forEach(([key, value]) => {
        root.style.setProperty(`--layout-max-width-${key}`, value);
      });
    }

    // === Layout - Container Padding ===
    if (tokens.layout?.container) {
      Object.entries(tokens.layout.container).forEach(([key, value]) => {
        root.style.setProperty(`--layout-container-${key}`, value);
      });
    }

    // === Update Body Styles ===
    if (tokens.fonts?.primary) {
      document.body.style.fontFamily = tokens.fonts.primary;
    }
    if (tokens.colors?.neutral?.DEFAULT) {
      document.body.style.backgroundColor = tokens.colors.neutral.DEFAULT;
    }
    if (tokens.colors?.neutral?.black) {
      document.body.style.color = tokens.colors.neutral.black;
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
