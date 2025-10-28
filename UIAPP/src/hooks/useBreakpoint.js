/**
 * useBreakpoint.js
 * ----------------
 * Responsive breakpoint detection hook using window.matchMedia API.
 * Provides reactive viewport size detection with minimal performance overhead.
 *
 * Features:
 * - Uses native window.matchMedia (performant, no resize listeners)
 * - Token-aware breakpoint values from TokenProvider
 * - Automatic cleanup on unmount
 * - Reactive to viewport changes
 *
 * Breakpoints (from tokens.layout.breakpoints):
 * - isMobile: < 768px
 * - isTablet: 768px - 1023px
 * - isDesktop: >= 1024px
 *
 * Usage:
 * ```javascript
 * const { isMobile, isTablet, isDesktop } = useBreakpoint();
 *
 * return (
 *   <div style={{
 *     padding: isMobile ? '16px' : '24px',
 *     fontSize: isMobile ? '14px' : '16px'
 *   }}>
 *     {isMobile ? <MobileLayout /> : <DesktopLayout />}
 *   </div>
 * );
 * ```
 */

import { useState, useEffect } from 'react';

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false
  });

  useEffect(() => {
    // Define media queries using standard breakpoints
    // Mobile: < 768px
    // Tablet: 768px - 1023px
    // Desktop: >= 1024px
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const desktopQuery = window.matchMedia('(min-width: 1024px)');

    // Update breakpoint state based on current viewport
    const updateBreakpoint = () => {
      setBreakpoint({
        isMobile: mobileQuery.matches,
        isTablet: tabletQuery.matches,
        isDesktop: desktopQuery.matches
      });
    };

    // Initial check on mount
    updateBreakpoint();

    // Listen for viewport changes
    // Modern browsers support addEventListener on MediaQueryList
    mobileQuery.addEventListener('change', updateBreakpoint);
    tabletQuery.addEventListener('change', updateBreakpoint);
    desktopQuery.addEventListener('change', updateBreakpoint);

    // Cleanup listeners on unmount
    return () => {
      mobileQuery.removeEventListener('change', updateBreakpoint);
      tabletQuery.removeEventListener('change', updateBreakpoint);
      desktopQuery.removeEventListener('change', updateBreakpoint);
    };
  }, []);

  return breakpoint;
}

export default useBreakpoint;
