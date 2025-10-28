/**
 * MasterLayout.jsx
 * ----------------
 * Master layout structure used across all recording screens.
 * Provides consistent 3-section layout with unified header.
 *
 * Structure:
 * - SECTION A: Flexible header with A1 (back) | A2 (content) | A3 (icon)
 * - SECTION B: Main content area (flex grows)
 * - SECTION C: Bottom button area (100px fixed)
 *
 * Section A2 renders: Text or any React component (e.g., RecordingBar)
 */

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { MdChevronLeft } from 'react-icons/md';
import { useTokens } from '../theme/TokenProvider';
import { useBreakpoint } from '../hooks/useBreakpoint';
import Logo from '../Assets/Logo.png';
import AuthImage from '../Assets/Auth_Image.png';

function MasterLayout({
  content = null,
  actions = null,
  className = '',
  showBanner = true,
  bannerContent = null,
  children = null,
  onBack = null,
  showBackButton = true,
  iconA3 = null,
  bannerStyle = null,
  overlay = null
}) {
  const { tokens } = useTokens();
  const { isMobile } = useBreakpoint();

  // Determine if this is the welcome screen for special styling
  const isWelcomeScreen = className.includes('welcome-state');

  // Determine if this is the active recording screen for dark background
  const isActiveRecordingScreen = className.includes('active-recording-state');
  const isPausedRecordingScreen = className.includes('paused-recording-state');

  // Inject mobile-only CSS for welcome screen background
  useEffect(() => {
    if (!isWelcomeScreen) return;

    const styleId = 'welcome-screen-mobile-bg';

    // Check if style already exists
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @media (max-width: 767px) {
        .page-container-welcome {
          background-image: url(${AuthImage}) !important;
          background-size: cover !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existing = document.getElementById(styleId);
      if (existing) {
        document.head.removeChild(existing);
      }
    };
  }, [isWelcomeScreen]);

  // Determine content for SECTION A2 (mobile-only logo on welcome screen)
  const renderA2Content = () => {
    if (isMobile && isWelcomeScreen) {
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
    return bannerContent;
  };

  return (
    // ========================================
    // # MASTER CONTAINER (PAGE-CONTAINER)
    // ========================================
    // Outer page container (red border in layout diagram)
    <div
      className={isWelcomeScreen ? 'page-container-welcome' : ''}
      style={{
        display: 'flex',
        flexDirection: 'column',
        // Mobile: transparent to show background image
        // Desktop: blue background
        // Active/Paused recording: dark recording background
        backgroundColor: isWelcomeScreen
          ? (isMobile ? 'transparent' : tokens.colors.primary.DEFAULT)
          : (isActiveRecordingScreen || isPausedRecordingScreen)
            ? tokens.colors.background.recording
            : tokens.colors.neutral.default,
        minHeight: '100dvh',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        // DEBUG: PAGE-CONTAINER border
        // border: '3px solid red'
      }}>

      {/* ========================================
          # SECTION A (HEADER)
          ========================================
          Single banner with flexible A2 content
          All sections render props directly (no defaults)

          A1: Back button (45px) | A2: Flexible content | A3: Icon slot (45px)
      */}
      {showBanner && (
        <div style={{
          position: 'sticky',
          top: 0,
          left: 0,
          width: '100%',
          height: '70px',
          minHeight: '70px',
          maxHeight: '70px',
          // Mobile welcome screen: transparent header to show background image
          // Other screens: standard header backgrounds
          backgroundColor: (isMobile && isWelcomeScreen)
            ? 'transparent'
            : (bannerContent ? tokens.colors.neutral.default : tokens.colors.background.light),
          color: tokens.colors.primary.DEFAULT,
          zIndex: tokens.zIndex.header,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          padding: 0,
          fontWeight: tokens.fontWeight.medium,
          fontSize: tokens.fontSize.base,
          // DEBUG: SECTION-A border
          // border: '3px solid cyan',
          ...(bannerStyle || {})
        }}>
          {/* A1 - Back Button (45px) */}
          <div style={{
            flex: '0 0 45px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            // DEBUG: SECTION-A1 border
            // border: '2px solid orange'
          }}>
            {showBackButton && onBack && (
              <MdChevronLeft
                size={32}
                color={tokens.colors.primary.DEFAULT}
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
            // DEBUG: SECTION-A2 border
            // border: '2px solid yellow'
          }}>
            {renderA2Content()}
          </div>

          {/* A3 - Icon Slot (45px) */}
          <div style={{
            flex: '0 0 45px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            // DEBUG: SECTION-A3 border
            // border: '2px solid magenta'
          }}>
            {iconA3}
          </div>
        </div>
      )}

      {/* ========================================
          # CONTENT CONTAINER
          ========================================
          Main layout container (dark blue border in layout diagram)
          2-section layout: content area + actions
      */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        maxWidth: tokens.layout.maxWidth.md,
        margin: '0 auto',
        boxSizing: 'border-box',
        // Make transparent on mobile welcome screen to show background image
        backgroundColor: (isMobile && isWelcomeScreen) ? 'transparent' : undefined,
        // DEBUG: APP-LAYOUT border
        // border: '3px solid blue'
      }}>

        {/* ========================================
            # SECTION B (MAIN CONTENT)
            ========================================
            Main content area - flex grow content area (dark green in layout diagram)
            Main content area for prompts, instructions, media preview
        */}
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: '270px',
          overflow: 'hidden',
          width: '100%',
          padding: tokens.spacing[4],
          boxSizing: 'border-box',
          // DEBUG: SECTION-B border
          // border: '3px solid green'
        }}>
          {content}
          {overlay}
        </div>

        {/* ========================================
            # SECTION C (ACTIONS)
            ========================================
            Actions section - 100px fixed height (purple in layout diagram)
            Buttons and controls
        */}
        <div style={{
          flex: '0 0 100px',
          width: '100%',
          padding: `0 ${tokens.spacing[4]} ${tokens.spacing[5]} ${tokens.spacing[4]}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          boxSizing: 'border-box',
          // DEBUG: SECTION-C border
          // border: '3px solid purple'
        }}>
          {actions}
        </div>
      </div>

      {/* Overlays and dialogs rendered as children */}
      {children}
    </div>
  );
}

MasterLayout.propTypes = {
  content: PropTypes.node,
  actions: PropTypes.node,
  className: PropTypes.string,
  showBanner: PropTypes.bool,
  bannerContent: PropTypes.node,
  children: PropTypes.node,
  onBack: PropTypes.func,
  showBackButton: PropTypes.bool,
  iconA3: PropTypes.node,
  bannerStyle: PropTypes.object,
  overlay: PropTypes.node
};

export default MasterLayout;
