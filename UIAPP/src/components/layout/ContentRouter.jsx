/**
 * ContentRouter.jsx
 * -----------------
 * Utility that determines where banner content should appear
 * based on screen size and screen type.
 *
 * Logic:
 * - Mobile: Content in Section A2 (header)
 * - Tablet/Desktop: Content in Section B1B (subheader)
 * - All screens: bannerContent routes to appropriate section
 */

import React from 'react';

/**
 * Custom hook to route content to appropriate location
 *
 * @param {Object} params
 * @param {ReactNode} params.bannerContent - The content to display
 * @param {boolean} params.isWelcomeScreen - Whether this is the welcome screen
 * @param {boolean} params.isMobile - Whether viewport is mobile
 * @param {boolean} params.isTablet - Whether viewport is tablet
 * @param {boolean} params.isDesktop - Whether viewport is desktop
 *
 * @returns {Object} { mobileContent, desktopContent }
 */
export function useContentRouter({
  bannerContent,
  isWelcomeScreen,
  isMobile,
  isTablet,
  isDesktop
}) {
  // Determine content for SECTION A2 (mobile header)
  const mobileContent = React.useMemo(() => {
    // All mobile screens: Show bannerContent in A2 (including welcome screen)
    return isMobile ? bannerContent : null;
  }, [isMobile, bannerContent]);

  // Determine content for SECTION B1B (tablet/desktop subheader)
  const desktopContent = React.useMemo(() => {
    // All tablet/desktop screens: Show bannerContent in B1B (including welcome screen)
    return (isTablet || isDesktop) ? bannerContent : null;
  }, [isTablet, isDesktop, bannerContent]);

  return {
    mobileContent,
    desktopContent
  };
}

export default useContentRouter;
