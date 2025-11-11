/**
 * ContentRouter.jsx
 * -----------------
 * Utility that determines where banner content should appear
 * based on screen size and screen type.
 *
 * Logic:
 * - Mobile: Content in Section A2 (header)
 * - Tablet/Desktop: Content in Section B1B (subheader)
 * - Welcome screen (mobile): Logo in A2
 * - Welcome screen (desktop): No content in B1B
 */

import React from 'react';
import Logo from '../../Assets/Logo.png';

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
    if (isMobile && isWelcomeScreen) {
      // Welcome screen on mobile: Show logo in A2
      return (
        <img
          src={Logo}
          alt="Love Retold"
          style={{
            height: '30px',
            width: 'auto',
            objectFit: 'contain'
          }}
        />
      );
    }
    // All other mobile screens: Show bannerContent in A2
    return isMobile ? bannerContent : null;
  }, [isMobile, isWelcomeScreen, bannerContent]);

  // Determine content for SECTION B1B (tablet/desktop subheader)
  const desktopContent = React.useMemo(() => {
    // Welcome screen on tablet/desktop: Don't show banner in B1B
    if ((isTablet || isDesktop) && isWelcomeScreen) {
      return null;
    }
    // All other tablet/desktop screens: Show bannerContent in B1B
    return (isTablet || isDesktop) ? bannerContent : null;
  }, [isTablet, isDesktop, isWelcomeScreen, bannerContent]);

  return {
    mobileContent,
    desktopContent
  };
}

export default useContentRouter;
