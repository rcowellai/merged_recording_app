/**
 * MasterLayout.jsx
 * ----------------
 * Master layout structure used across all recording screens.
 * Provides consistent 2-section layout with unified header.
 *
 * Structure:
 * - app-banner: Flexible header with A1 (back) | A2 (content) | A3 (icon)
 * - prompt-section: Main content area (flex grows)
 * - actions-section: Bottom button area (100px fixed)
 *
 * Banner A2 supports: Logo (default), Text, or any React component (e.g., RecordingBar)
 */

import React from 'react';
import PropTypes from 'prop-types';
import { MdChevronLeft } from 'react-icons/md';
import AppBanner from './AppBanner';

function MasterLayout({
  content = null,
  actions = null,
  className = '',
  showBanner = true,
  bannerContent = null,
  children = null,
  onBack = null,
  showBackButton = true,
  iconA3 = null
}) {
  return (
    // ========================================
    // # MASTER CONTAINER
    // ========================================
    // Outer page container (red border in layout diagram)
    <div className={`page-container ${className}`.trim()}>

      {/* ========================================
          # HEADER - UNIFIED BANNER
          ========================================
          Single banner with flexible A2 content
          - No bannerContent: AppBanner logo with blue background
          - Has bannerContent: Custom content with gray background

          A1: Back button (60px) | A2: Flexible content | A3: Icon slot (60px)
      */}
      {showBanner && (
        <div
          className="app-banner"
          style={{
            backgroundColor: bannerContent
              ? 'var(--color-neutral-default)'
              : 'var(--banner-bg)'
          }}
        >
          {/* A1 - Back Button (60px) */}
          <div className="section-a1">
            {showBackButton && onBack && (
              <MdChevronLeft
                size={32}
                color="var(--color-primary-default)"
                onClick={onBack}
                style={{ cursor: 'pointer' }}
              />
            )}
          </div>

          {/* A2 - Flexible Content (flex-grow) */}
          <div className="section-a2">
            {bannerContent || <AppBanner logoSize={30} noWrapper={true} />}
          </div>

          {/* A3 - Icon Slot (60px) */}
          <div className="section-a3">
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
      <div className="app-layout">

        {/* ========================================
            # SECTION B (MAIN AREA)
            ========================================
            Prompt section - flex grow content area (dark green in layout diagram)
            Main content area for prompts, instructions, media preview
        */}
        <div className="prompt-section">
          {content}
        </div>

        {/* ========================================
            # SECTION C (ACTION AREA)
            ========================================
            Actions section - 100px fixed height (purple in layout diagram)
            Buttons and controls
        */}
        <div className="actions-section">
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
  iconA3: PropTypes.node
};

export default MasterLayout;
