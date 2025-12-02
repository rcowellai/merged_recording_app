/**
 * LayoutHeader.jsx
 * ----------------
 * Top navigation header component for all screens.
 * Handles mobile (A1|A2|A3) and desktop (unified) layouts.
 *
 * Mobile Layout:
 * - A1: Back button (45px)
 * - A2: Content/logo (flex)
 * - A3: Icon slot (45px)
 *
 * Desktop Layout:
 * - Unified section with left-aligned logo
 * - Banner content moves to Section B1B instead
 */

import React from 'react';
import PropTypes from 'prop-types';
import { MdChevronLeft } from 'react-icons/md';
import { useTokens } from '../../theme/TokenProvider';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { ReactComponent as PremiumLogo } from '../../Assets/Name_only.svg';
import Logo from '../../Assets/Logo.png';

function LayoutHeader({
  showBackButton = true,
  onBack = null,
  bannerContent = null,
  iconA3 = null,
  isWelcomeScreen = false,
  isActiveRecordingScreen = false,
  isPausedRecordingScreen = false,
  bannerStyle = null
}) {
  const { tokens } = useTokens();
  const { isMobile } = useBreakpoint();

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      left: 0,
      width: '100%',
      // Responsive height: 70px mobile, 75px tablet/desktop
      height: isMobile ? '70px' : '75px',
      minHeight: isMobile ? '70px' : '75px',
      maxHeight: isMobile ? '70px' : '75px',
      // Background color logic matches MasterLayout.jsx exactly:
      // 1. Welcome screen: neutral default background (no blue)
      // 2. Active/Paused recording screens: dark recording background
      // 3. All other screens: neutral default background
      backgroundColor: (isActiveRecordingScreen || isPausedRecordingScreen)
        ? tokens.colors.background.recording
        : tokens.colors.neutral.default,
      color: tokens.colors.primary.DEFAULT,
      zIndex: tokens.zIndex.header,
      display: 'flex',
      alignItems: 'center',
      justifyContent: isMobile ? 'space-between' : 'center',
      boxSizing: 'border-box',
      padding: 0,
      fontWeight: tokens.fontWeight.medium,
      fontSize: tokens.fontSize.base,
      ...(bannerStyle || {})
    }}>
      {isMobile ? (
        // Mobile: A1, A2, A3 subdivided structure
        <>
          {/* A1 - Back Button (45px) */}
          <div style={{
            flex: '0 0 45px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
          }}>
            {showBackButton && onBack && (
              <MdChevronLeft
                size={32}
                color={tokens.colors.clay.DEFAULT}
                onClick={onBack}
                style={{ cursor: 'pointer' }}
              />
            )}
          </div>

          {/* A2 - Flexible Content (flex-grow) */}
          <div style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxSizing: 'border-box',
            color: tokens.colors.primary.DEFAULT,
            fontFamily: tokens.fonts.secondary,
            fontWeight: tokens.fontWeight.medium,
            fontSize: tokens.fontSize['3xl'] // Mobile: 30px (increased from 2xl/24px)
          }}>
            {bannerContent}
          </div>

          {/* A3 - Icon Slot (45px) */}
          <div style={{
            flex: '0 0 45px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
          }}>
            {iconA3}
          </div>
        </>
      ) : (
        // Tablet/Desktop: Unified Section A with logo (centered)
        // Hide logo on welcome screen (logo is in content area instead)
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}>
          {!isWelcomeScreen && (
            isActiveRecordingScreen || isPausedRecordingScreen ? (
              <img
                src={Logo}
                alt="Love Retold"
                style={{
                  height: '30px',
                  width: 'auto',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <PremiumLogo
                style={{
                  height: '50px',
                  width: 'auto',
                  paddingTop: tokens.spacing[3],
                  paddingBottom: tokens.spacing[3]
                }}
                aria-label="Love Retold"
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

LayoutHeader.propTypes = {
  showBackButton: PropTypes.bool,
  onBack: PropTypes.func,
  bannerContent: PropTypes.node,
  iconA3: PropTypes.node,
  isWelcomeScreen: PropTypes.bool,
  isActiveRecordingScreen: PropTypes.bool,
  isPausedRecordingScreen: PropTypes.bool,
  bannerStyle: PropTypes.object
};

export default LayoutHeader;
