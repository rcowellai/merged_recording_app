/**
 * MasterLayout.jsx
 * ----------------
 * Master layout structure used across all recording screens.
 * Provides consistent 3-section layout with unified header.
 *
 * Structure:
 * - SECTION A: LayoutHeader component (70-75px fixed)
 * - SECTION B: Main content area (flex grows)
 *   - Mobile: Single section
 *   - Tablet/Desktop: TabletDesktopSubheader (B1) + Content (B2)
 * - SECTION C: Bottom actions area (100-150px fixed)
 *
 * Components Used:
 * - LayoutHeader: Top navigation with back button, content, and icon
 * - TabletDesktopSubheader: Secondary header on tablet/desktop
 * - ContentRouter: Utility to route content to correct location
 *
 * Special Handling:
 * - Recording screens: Dark background color for active/paused states
 * - Welcome screen: Uses neutral default background (no special styling)
 *
 * Phase 2 Refactor: Extracted from 423-line monolithic component
 * See: LayoutHeader.jsx, TabletDesktopSubheader.jsx, ContentRouter.jsx
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTokens } from '../theme/TokenProvider';
import { useBreakpoint } from '../hooks/useBreakpoint';
import LayoutHeader from './layout/LayoutHeader';
import { useContentRouter } from './layout/ContentRouter';
import TabletDesktopSubheader from './layout/TabletDesktopSubheader';

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
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  // Determine if this is the welcome screen for special styling
  const isWelcomeScreen = className.includes('welcome-state');

  // Determine if this is the active recording screen for dark background
  const isActiveRecordingScreen = className.includes('active-recording-state');
  const isPausedRecordingScreen = className.includes('paused-recording-state');

  // Route banner content to appropriate location (mobile A2 vs desktop B1B)
  const { mobileContent, desktopContent } = useContentRouter({
    bannerContent,
    isWelcomeScreen,
    isMobile,
    isTablet,
    isDesktop
  });

  // Background image injection removed - WelcomeScreen now uses neutral background

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
        // Welcome screen: neutral default background (no image, no blue)
        // Active/Paused recording: dark recording background
        // All other screens: neutral default background
        backgroundColor: (isActiveRecordingScreen || isPausedRecordingScreen)
          ? tokens.colors.background.recording
          : tokens.colors.neutral.default,
        minHeight: '100dvh',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative'
      }}>

      {/* ========================================
          # SECTION A (HEADER)
          ========================================
          Single banner with flexible A2 content
      */}
      {showBanner && (
        <LayoutHeader
          showBackButton={showBackButton}
          onBack={onBack}
          bannerContent={mobileContent}
          iconA3={iconA3}
          isWelcomeScreen={isWelcomeScreen}
          isActiveRecordingScreen={isActiveRecordingScreen}
          isPausedRecordingScreen={isPausedRecordingScreen}
          bannerStyle={bannerStyle}
        />
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
        // Content container uses default background (no special welcome screen handling)
        backgroundColor: undefined,
        // Expose layout metrics as CSS variables for inner components
        '--headerH': isMobile ? '70px' : '75px',
        '--actionsH': isMobile ? '100px' : '150px',
        '--contentPad': tokens.spacing[4]
      }}>

        {/* ========================================
            # SECTION B (MAIN CONTENT)
            ========================================
            Main content area - flex grow content area (dark green in layout diagram)
            Main content area for prompts, instructions, media preview

            Mobile: Single section
            Tablet/Desktop: Split into B1 (100px top) and B2 (flex grow)
        */}
        {isMobile ? (
          // Mobile: Single unified section
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            minHeight: '270px',
            overflow: 'visible',
            width: '100%',
            padding: tokens.spacing[4],
            boxSizing: 'border-box'
          }}>
            {content}
            {overlay}
          </div>
        ) : (
          // Tablet/Desktop: Split into B1 and B2
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            minHeight: '270px',
            overflow: 'visible',
            width: '100%',
            maxWidth: '550px',
            margin: '0 auto',
            boxSizing: 'border-box'
          }}>
            {/* B1 - Top Section (70px fixed) */}
            <TabletDesktopSubheader
              showBackButton={showBackButton}
              onBack={onBack}
              content={desktopContent}
              iconA3={iconA3}
            />

            {/* B2 - Main Content (flex grow) */}
            <div style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 auto',
              width: '100%',
              padding: tokens.spacing[4],
              boxSizing: 'border-box'
            }}>
              {content}
              {overlay}
            </div>
          </div>
        )}

        {/* ========================================
            # SECTION C (ACTIONS)
            ========================================
            Actions section - 100px mobile, 150px tablet/desktop (purple in layout diagram)
            Buttons and controls
        */}
        <div style={{
          flex: `0 0 ${isMobile ? '100px' : '150px'}`,
          width: '100%',
          maxWidth: (isTablet || isDesktop) ? '550px' : '100%',
          margin: (isTablet || isDesktop) ? '0 auto' : '0',
          padding: `0 ${tokens.spacing[4]} ${tokens.spacing[5]} ${tokens.spacing[4]}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: isMobile ? 'flex-end' : 'flex-start',
          boxSizing: 'border-box'
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
