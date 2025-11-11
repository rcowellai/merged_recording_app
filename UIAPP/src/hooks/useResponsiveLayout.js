/**
 * useResponsiveLayout.js
 * ----------------------
 * Unified responsive layout hook that replaces 4 competing flex/height strategies.
 * Provides consistent layout behavior across all screens and breakpoints.
 *
 * Problem Solved:
 * - Eliminates: flex: isMobile ? 'none' : 1
 * - Eliminates: height: isMobile ? '100%' : undefined
 * - Eliminates: flex: isMobile ? 'none' : '1 1 auto'
 * - Eliminates: flex: isMobile ? '0 0 auto' : '1'
 *
 * Usage:
 * ```javascript
 * const layout = useResponsiveLayout({ section: 'content' });
 *
 * return (
 *   <div style={layout}>
 *     {children}
 *   </div>
 * );
 * ```
 *
 * Section Types:
 * - 'content': Main content area that grows to fill space
 * - 'header': Fixed header section
 * - 'actions': Fixed action button area
 * - 'custom': Provide your own overrides
 */

import { useBreakpoint } from './useBreakpoint';

/**
 * Default layout configurations per section type
 */
const LAYOUT_PRESETS = {
  content: {
    mobile: {
      flex: 'none',
      height: '100%',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    },
    tablet: {
      flex: 1,
      height: undefined,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    },
    desktop: {
      flex: 1,
      height: undefined,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }
  },
  header: {
    mobile: {
      flex: 'none',
      height: 'auto',
      overflow: 'visible'
    },
    tablet: {
      flex: 'none',
      height: 'auto',
      overflow: 'visible'
    },
    desktop: {
      flex: 'none',
      height: 'auto',
      overflow: 'visible'
    }
  },
  actions: {
    mobile: {
      flex: 'none',
      height: 'auto',
      overflow: 'visible'
    },
    tablet: {
      flex: 'none',
      height: 'auto',
      overflow: 'visible'
    },
    desktop: {
      flex: 'none',
      height: 'auto',
      overflow: 'visible'
    }
  }
};

/**
 * useResponsiveLayout Hook
 *
 * @param {Object} options - Configuration options
 * @param {string} options.section - Section type: 'content' | 'header' | 'actions' | 'custom'
 * @param {Object} options.customStyles - Additional styles to merge
 * @param {string|number} options.flex - Override flex value
 * @param {string|number} options.height - Override height value
 * @param {string} options.overflow - Override overflow value
 *
 * @returns {Object} CSS style object for inline styles
 */
export function useResponsiveLayout({
  section = 'content',
  customStyles = {},
  flex = undefined,
  height = undefined,
  overflow = undefined
} = {}) {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  // Determine breakpoint key
  const breakpointKey = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  // Get base layout from presets
  const preset = LAYOUT_PRESETS[section]?.[breakpointKey] || LAYOUT_PRESETS.content[breakpointKey];

  // Merge with overrides and custom styles
  return {
    ...preset,
    ...(flex !== undefined && { flex }),
    ...(height !== undefined && { height }),
    ...(overflow !== undefined && { overflow }),
    ...customStyles
  };
}

export default useResponsiveLayout;
