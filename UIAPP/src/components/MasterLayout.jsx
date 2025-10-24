/**
 * MasterLayout.jsx
 * ----------------
 * Master layout structure used across all recording screens.
 * Provides consistent 3-section layout: timer, content, actions.
 *
 * Sections:
 * - timer-bar-section: Top bar for timer/countdown (60px fixed)
 * - prompt-section: Main content area (flex grows)
 * - actions-section: Bottom button area (100px fixed)
 *
 * Note: .spacing-section removed per architecture update
 */

import React from 'react';
import PropTypes from 'prop-types';
import { MdChevronLeft } from 'react-icons/md';
import AppBanner from './AppBanner';

function MasterLayout({
  timer = null,
  content = null,
  actions = null,
  className = '',
  showBanner = true,
  bannerText = null,
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
          # HEADER
          ========================================
          Optional banner area (cyan in layout diagram)
          Split into A1 (30px) | A2 (flex) | A3 (30px) on mobile
      */}
      {showBanner && !bannerText && (
        <div className="app-banner">
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
          <div className="section-a2">
            <AppBanner logoSize={30} noWrapper={true} />
          </div>
          <div className="section-a3">
            {iconA3}
          </div>
        </div>
      )}
      {showBanner && bannerText && (
        <div className="app-banner" style={{ backgroundColor: 'var(--color-neutral-default)' }}>
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
          <div className="section-a2">
            <div style={{
              fontSize: 'var(--font-size-2xl)',
              color: 'var(--color-primary-default)',
              fontWeight: 'var(--font-weight-normal)',
              fontFamily: 'inherit',
              textAlign: 'center'
            }}>
              {bannerText}
            </div>
          </div>
          <div className="section-a3">
            {iconA3}
          </div>
        </div>
      )}

      {/* ========================================
          # CONTENT CONTAINER
          ========================================
          Main layout container (dark blue border in layout diagram)
      */}
      <div className="app-layout">

        {/* ========================================
            # SECTION A (TOP BAR)
            ========================================
            Timer bar section - 60px fixed height (lime green in layout diagram)
            For recording timer, countdown, or screen-specific text
        */}
        <div className="timer-bar-section">
          {timer}
        </div>

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
  timer: PropTypes.node,
  content: PropTypes.node,
  actions: PropTypes.node,
  className: PropTypes.string,
  showBanner: PropTypes.bool,
  bannerText: PropTypes.string,
  children: PropTypes.node,
  onBack: PropTypes.func,
  showBackButton: PropTypes.bool,
  iconA3: PropTypes.node
};

export default MasterLayout;
