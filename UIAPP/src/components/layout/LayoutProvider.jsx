/**
 * LayoutProvider.jsx
 * ------------------
 * Provider component for layout system configuration and screen-specific customization.
 * Works alongside existing CSS classes and provides runtime layout flexibility.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTokens } from '../../theme/TokenProvider';

// Layout Context
const LayoutContext = createContext(null);

/**
 * Hook to access layout system
 */
export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

/**
 * LayoutProvider Component
 * Provides layout system capabilities and screen-specific customization
 */
export const LayoutProvider = ({ children }) => {
  const { tokens } = useTokens();
  const [screenStyles, setScreenStyles] = useState({});
  const [currentBreakpoint, setCurrentBreakpoint] = useState('desktop');

  // Track window size and update breakpoint
  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      let newBreakpoint = 'desktop';
      
      if (width < 480) {
        newBreakpoint = 'mobile';
      } else if (width < 768) {
        newBreakpoint = 'tablet';
      }
      
      if (newBreakpoint !== currentBreakpoint) {
        setCurrentBreakpoint(newBreakpoint);
      }
    };

    // Initial check
    updateBreakpoint();
    
    // Listen for resize
    window.addEventListener('resize', updateBreakpoint);
    
    return () => {
      window.removeEventListener('resize', updateBreakpoint);
    };
  }, [currentBreakpoint]);

  // Apply screen-specific styles to CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    
    Object.entries(screenStyles).forEach(([screenId, styles]) => {
      Object.entries(styles).forEach(([property, value]) => {
        root.style.setProperty(`--${screenId}-${property}`, value);
      });
    });
  }, [screenStyles]);

  // Function to update styles for a specific screen
  const updateScreenStyles = (screenId, styles) => {
    setScreenStyles(prev => ({
      ...prev,
      [screenId]: {
        ...prev[screenId],
        ...styles
      }
    }));
  };

  // Function to reset styles for a screen
  const resetScreenStyles = (screenId) => {
    setScreenStyles(prev => {
      const newStyles = { ...prev };
      delete newStyles[screenId];
      return newStyles;
    });
    
    // Remove CSS custom properties
    const root = document.documentElement;
    const properties = Object.keys(screenStyles[screenId] || {});
    properties.forEach(property => {
      root.style.removeProperty(`--${screenId}-${property}`);
    });
  };

  // Responsive helper functions
  const isMobile = currentBreakpoint === 'mobile';
  const isTablet = currentBreakpoint === 'tablet';
  const isDesktop = currentBreakpoint === 'desktop';
  
  // Responsive value selector
  const responsive = (mobileValue, tabletValue = mobileValue, desktopValue = tabletValue) => {
    switch (currentBreakpoint) {
      case 'mobile': return mobileValue;
      case 'tablet': return tabletValue;
      default: return desktopValue;
    }
  };

  // Predefined layout configurations
  const layoutConfigs = {
    // Recording screen layout
    recording: {
      'max-width': '480px',
      'padding': '24px 16px',
      'flex-gap': '24px',
      'button-justify': 'space-between',
      'card-padding': '24px 16px'
    },
    
    // Admin screen layout
    admin: {
      'max-width': '800px',
      'padding': '32px 24px',
      'flex-gap': '32px',
      'grid-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
      'section-padding': '24px 0'
    },
    
    // Playback screen layout
    playback: {
      'max-width': '600px',
      'padding': '24px 16px',
      'media-width': '100%',
      'media-height': '300px',
      'button-direction': 'row',
      'button-justify': 'space-between'
    }
  };

  // Function to apply predefined layout
  const applyLayoutConfig = (screenId, configName) => {
    const config = layoutConfigs[configName];
    if (config) {
      updateScreenStyles(screenId, config);
    }
  };

  // Get current screen styles
  const getScreenStyles = (screenId) => {
    return screenStyles[screenId] || {};
  };

  const value = {
    // State
    currentBreakpoint,
    screenStyles,
    tokens,
    
    // Screen management
    updateScreenStyles,
    resetScreenStyles,
    getScreenStyles,
    applyLayoutConfig,
    
    // Responsive helpers
    isMobile,
    isTablet,
    isDesktop,
    responsive,
    
    // Layout configurations
    layoutConfigs
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
};

export default LayoutProvider;