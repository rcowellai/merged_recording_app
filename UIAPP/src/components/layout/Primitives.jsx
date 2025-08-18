/**
 * Primitives.jsx
 * --------------
 * Layout primitive components using Emotion/styled.
 * Provides flexible, reusable layout components that work alongside existing CSS.
 */

import styled from '@emotion/styled';
import { useTokens } from '../../theme/TokenProvider';

/**
 * Container - Main content wrapper with responsive max-width
 */
export const Container = styled.div`
  width: 100%;
  max-width: ${props => props.maxWidth || 'var(--layout-max-width, 480px)'};
  margin: 0 auto;
  padding: ${props => props.padding || 'var(--layout-container-padding, 24px 16px)'};
  box-sizing: border-box;
  
  /* Screen-specific overrides via CSS custom properties */
  ${props => props.screenId && `
    max-width: var(--${props.screenId}-max-width, ${props.maxWidth || 'var(--layout-max-width, 480px)'});
    padding: var(--${props.screenId}-padding, ${props.padding || 'var(--layout-container-padding, 24px 16px)'});
  `}
  
  /* Additional customization props */
  ${props => props.centerContent && 'display: flex; flex-direction: column; align-items: center;'}
  ${props => props.fullHeight && 'min-height: 100vh;'}
`;

/**
 * FlexBox - Flexible container for layout arrangements
 */
export const FlexBox = styled.div`
  display: flex;
  flex-direction: ${props => props.direction || 'column'};
  gap: ${props => props.gap || 'var(--spacing-md, 16px)'};
  align-items: ${props => props.align || 'stretch'};
  justify-content: ${props => props.justify || 'flex-start'};
  flex-wrap: ${props => props.wrap || 'nowrap'};
  
  /* Responsive behavior */
  ${props => props.responsive && `
    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-sm, 12px);
    }
  `}
  
  /* Screen-specific customization */
  ${props => props.screenId && `
    gap: var(--${props.screenId}-flex-gap, ${props.gap || 'var(--spacing-md, 16px)'});
    align-items: var(--${props.screenId}-flex-align, ${props.align || 'stretch'});
    justify-content: var(--${props.screenId}-flex-justify, ${props.justify || 'flex-start'});
  `}
`;

/**
 * Grid - CSS Grid container for complex layouts
 */
export const Grid = styled.div`
  display: grid;
  grid-template-columns: ${props => props.columns || 'repeat(auto-fit, minmax(250px, 1fr))'};
  grid-template-rows: ${props => props.rows || 'auto'};
  gap: ${props => props.gap || 'var(--spacing-md, 16px)'};
  align-items: ${props => props.align || 'start'};
  justify-items: ${props => props.justify || 'stretch'};
  
  /* Screen-specific customization */
  ${props => props.screenId && `
    grid-template-columns: var(--${props.screenId}-grid-columns, ${props.columns || 'repeat(auto-fit, minmax(250px, 1fr))'});
    gap: var(--${props.screenId}-grid-gap, ${props.gap || 'var(--spacing-md, 16px)'});
  `}
`;

/**
 * Card - Styled card container with elevation and rounded corners
 */
export const Card = styled.div`
  background-color: ${props => props.background || 'var(--color-card-bg, #FFFFFF)'};
  color: ${props => props.color || 'var(--color-card-text, #333333)'};
  border-radius: ${props => props.borderRadius || 'var(--border-radius-card, 12px)'};
  box-shadow: ${props => props.elevation === 'high' ? 'var(--shadow-overlay, 0 0 25px rgba(0,0,0,0.2))' : 'var(--shadow-card, 0 0 10px rgba(0,0,0,0.1))'};
  padding: ${props => props.padding || 'var(--spacing-lg, 24px)'};
  box-sizing: border-box;
  overflow: ${props => props.overflow || 'hidden'};
  
  /* Interactive states */
  transition: all 0.2s ease;
  ${props => props.hover && `
    cursor: pointer;
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-overlay, 0 0 25px rgba(0,0,0,0.2));
    }
  `}
  
  /* Screen-specific customization */
  ${props => props.screenId && `
    padding: var(--${props.screenId}-card-padding, ${props.padding || 'var(--spacing-lg, 24px)'});
    border-radius: var(--${props.screenId}-card-radius, ${props.borderRadius || 'var(--border-radius-card, 12px)'});
  `}
`;

/**
 * Spacer - Flexible spacing component
 */
export const Spacer = styled.div`
  flex-shrink: 0;
  width: ${props => props.width || 'auto'};
  height: ${props => props.height || 'var(--spacing-md, 16px)'};
  
  /* Screen-specific spacing */
  ${props => props.screenId && `
    height: var(--${props.screenId}-spacer-height, ${props.height || 'var(--spacing-md, 16px)'});
    width: var(--${props.screenId}-spacer-width, ${props.width || 'auto'});
  `}
`;

/**
 * Section - Semantic content section with consistent spacing
 */
export const Section = styled.section`
  width: 100%;
  padding: ${props => props.padding || 'var(--spacing-xl, 30px) 0'};
  margin: ${props => props.margin || '0'};
  
  /* Conditional borders and backgrounds */
  ${props => props.bordered && 'border-top: 1px solid var(--color-secondary-bg, #E4E2D8);'}
  ${props => props.background && `background-color: ${props.background};`}
  
  /* Screen-specific customization */
  ${props => props.screenId && `
    padding: var(--${props.screenId}-section-padding, ${props.padding || 'var(--spacing-xl, 30px) 0'});
  `}
`;

/**
 * ButtonRow - Specialized layout for button arrangements
 */
export const ButtonRow = styled(FlexBox)`
  width: 100%;
  
  /* Override FlexBox defaults for button layouts */
  flex-direction: ${props => props.direction || 'row'};
  gap: ${props => props.gap || 'var(--spacing-sm, 12px)'};
  align-items: ${props => props.align || 'center'};
  justify-content: ${props => props.justify || 'space-between'};
  
  /* Button layout variants */
  ${props => props.variant === 'centered' && `
    justify-content: center;
  `}
  
  ${props => props.variant === 'split' && `
    justify-content: space-between;
  `}
  
  ${props => props.variant === 'stack' && `
    flex-direction: column;
    gap: var(--spacing-sm, 12px);
  `}
  
  /* Responsive stacking */
  ${props => props.stackOnMobile && `
    @media (max-width: 480px) {
      flex-direction: column;
      gap: var(--spacing-sm, 12px);
    }
  `}
  
  /* Screen-specific button arrangement */
  ${props => props.screenId && `
    justify-content: var(--${props.screenId}-button-justify, ${props.justify || 'space-between'});
    flex-direction: var(--${props.screenId}-button-direction, ${props.direction || 'row'});
  `}
`;

/**
 * MediaContainer - Container for media elements (video, audio, images)
 */
export const MediaContainer = styled.div`
  position: relative;
  width: ${props => props.width || '100%'};
  height: ${props => props.height || 'auto'};
  border-radius: ${props => props.borderRadius || 'var(--border-radius, 8px)'};
  overflow: hidden;
  background-color: ${props => props.background || 'var(--color-primary-bg, #F5F4F0)'};
  
  /* Aspect ratio maintenance */
  ${props => props.aspectRatio && `
    aspect-ratio: ${props.aspectRatio};
  `}
  
  /* Media element styling */
  & > video,
  & > img,
  & > canvas {
    width: 100%;
    height: 100%;
    object-fit: ${props => props.objectFit || 'cover'};
  }
  
  /* Screen-specific media container */
  ${props => props.screenId && `
    width: var(--${props.screenId}-media-width, ${props.width || '100%'});
    height: var(--${props.screenId}-media-height, ${props.height || 'auto'});
  `}
`;

/**
 * OverlayContainer - Container for overlay content with backdrop
 */
export const OverlayContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => props.backdrop || 'rgba(0, 0, 0, 0.6)'};
  display: flex;
  align-items: ${props => props.align || 'center'};
  justify-content: ${props => props.justify || 'center'};
  z-index: ${props => props.zIndex || 10000};
  padding: var(--spacing-lg, 24px);
  box-sizing: border-box;
  
  /* Animation support */
  ${props => props.animated && `
    animation: overlayFadeIn 0.2s ease-out;
    
    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `}
`;

/**
 * Hook to provide layout utilities and screen-specific customization
 */
export const useLayoutUtils = () => {
  const { tokens } = useTokens();
  
  // Helper function to set screen-specific CSS custom properties
  const setScreenStyles = (screenId, styles) => {
    const root = document.documentElement;
    Object.entries(styles).forEach(([key, value]) => {
      root.style.setProperty(`--${screenId}-${key}`, value);
    });
  };
  
  // Helper to get current breakpoint
  const getBreakpoint = () => {
    const width = window.innerWidth;
    if (width < 480) return 'mobile';
    if (width < 768) return 'tablet';
    return 'desktop';
  };
  
  // Helper to create responsive values
  const responsive = (mobileValue, tabletValue = mobileValue, desktopValue = tabletValue) => {
    const breakpoint = getBreakpoint();
    switch (breakpoint) {
      case 'mobile': return mobileValue;
      case 'tablet': return tabletValue;
      default: return desktopValue;
    }
  };
  
  return {
    tokens,
    setScreenStyles,
    getBreakpoint,
    responsive
  };
};

// Export all components as default object for easier imports
export default {
  Container,
  FlexBox,
  Grid,
  Card,
  Spacer,
  Section,
  ButtonRow,
  MediaContainer,
  OverlayContainer,
  useLayoutUtils
};