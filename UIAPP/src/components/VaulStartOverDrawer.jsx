/**
 * VaulStartOverDrawer.jsx
 * ------------------------
 * Start Over confirmation drawer using Vaul (bottom sheet).
 * Replaces RadixStartOverDialog with mobile-first slide-up design.
 *
 * Design Specifications:
 * - Slides up from bottom (no drag-to-dismiss)
 * - Minimal design (no illustration)
 * - Close X button in top-right
 * - Buttons stack vertically on mobile (width <= 480px)
 * - Confirm button: Red (#ef4444)
 * - Cancel button: Light beige (#F0EFEB)
 */

import React, { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import PropTypes from 'prop-types';
import { useTokens } from '../theme/TokenProvider';
import { useBreakpoint } from '../hooks/useBreakpoint';

function VaulStartOverDrawer({ open, onOpenChange, onConfirm, onCancel }) {
  const { tokens } = useTokens();
  const { isMobile: isSmallMobile, isTablet } = useBreakpoint();
  const [isMobile, setIsMobile] = useState(false);

  // Determine if we need centering wrapper (desktop only)
  const needsCentering = !isSmallMobile && !isTablet;

  // Mobile detection for responsive button layout (480px threshold)
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 480);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      dismissible={false}  // Disable drag-to-dismiss gestures
      shouldScaleBackground={false}  // Cleaner animation without background scaling
    >
      <Drawer.Portal>
        {/* Overlay / Backdrop */}
        <Drawer.Overlay
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 10000,
          }}
        />

        {needsCentering ? (
          /* Desktop: Centering Wrapper - Handles horizontal centering with transform */
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: '768px',
              width: '100%',
              zIndex: 10001,
            }}
          >
            {/* Drawer Content - Vaul animates this independently */}
            <Drawer.Content
              style={{
                position: 'relative',
                maxHeight: '85vh',
                backgroundColor: tokens.colors.neutral.DEFAULT,
                borderRadius: '16px 16px 0 0',
                fontFamily: tokens.fonts.primary,
                outline: 'none',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              aria-labelledby="drawer-title"
              aria-describedby="drawer-description"
            >
          {/* Header with Title and Close Button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 24px 4px 24px',
            }}
          >
            {/* Left-aligned title */}
            <Drawer.Title
              id="drawer-title"
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: tokens.colors.primary.DEFAULT,
                margin: 0,
                lineHeight: 1,
                textAlign: 'left',
              }}
            >
              Heads up!
            </Drawer.Title>

            {/* Right side with close button - borderless X */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  width: 'auto',
                  height: 'auto',
                  padding: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  color: tokens.colors.primary.DEFAULT,
                  lineHeight: 1,
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '0.6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = '1';
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Message Content */}
          <div
            style={{
              padding: '4px 24px 24px',
              flex: '1',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Drawer.Description
              id="drawer-description"
              style={{
                fontSize: 'clamp(15px, 4vw, 17px)',
                fontWeight: '400',
                lineHeight: '1.5',
                color: tokens.colors.primary.DEFAULT,
                margin: '0',
                textAlign: 'left',
                padding: '0',
              }}
            >
              This action will erase your current recording. Are you sure you want to proceed?
            </Drawer.Description>
          </div>

          {/* Action Buttons */}
          <div
            className="drawer-footer"
            style={{
              marginTop: 'auto',
              padding: 'min(24px, 5vw)',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '16px',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {/* Confirm Button - Error Red */}
            <button
              type="button"
              onClick={handleConfirm}
              style={{
                height: '45px',
                padding: '0 32px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: tokens.colors.status.error,
                color: '#FFFFFF',
                fontSize: tokens.fontSize.base,
                fontWeight: tokens.fontWeight.medium,
                cursor: 'pointer',
                minWidth: isMobile ? '100%' : 'auto',
                width: isMobile ? '100%' : 'auto',
              }}
            >
              Yes, re-record
            </button>

            {/* Cancel Button - Matches ChooseModeScreen left-hand button */}
            <button
              type="button"
              onClick={handleCancel}
              style={{
                height: '45px',
                padding: '0 32px',
                border: `0.5px solid ${tokens.colors.onboarding.fontColor}`,
                borderRadius: '8px',
                backgroundColor: tokens.colors.button.leftHandButton,
                color: tokens.colors.primary.DEFAULT,
                fontSize: tokens.fontSize.base,
                fontWeight: tokens.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: isMobile ? '100%' : 'auto',
                width: isMobile ? '100%' : 'auto',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = tokens.colors.border.neutral;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = tokens.colors.button.leftHandButton;
              }}
              autoFocus
            >
              Cancel
            </button>
          </div>
        </Drawer.Content>
          </div>
        ) : (
          /* Mobile/Tablet: Direct positioning - No wrapper to avoid transform conflicts */
          <Drawer.Content
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: '768px',
              margin: '0 auto',
              maxHeight: '85vh',
              backgroundColor: tokens.colors.neutral.DEFAULT,
              borderRadius: '16px 16px 0 0',
              fontFamily: tokens.fonts.primary,
              outline: 'none',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 10001,
            }}
            aria-labelledby="drawer-title"
            aria-describedby="drawer-description"
          >
          {/* Header with Title and Close Button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 24px 4px 24px',
            }}
          >
            {/* Left-aligned title */}
            <Drawer.Title
              id="drawer-title"
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: tokens.colors.primary.DEFAULT,
                margin: 0,
                lineHeight: 1,
                textAlign: 'left',
              }}
            >
              Heads up!
            </Drawer.Title>

            {/* Right side with close button - borderless X */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  width: 'auto',
                  height: 'auto',
                  padding: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  color: tokens.colors.primary.DEFAULT,
                  lineHeight: 1,
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '0.6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = '1';
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Description Text */}
          <div
            style={{
              padding: '4px 24px 16px',
            }}
          >
            <Drawer.Description
              id="drawer-description"
              style={{
                fontSize: 'clamp(15px, 4vw, 17px)',
                fontWeight: '400',
                lineHeight: '1.5',
                color: tokens.colors.primary.DEFAULT,
                margin: '0',
                textAlign: 'left',
              }}
            >
              If you start over, your current recording will be deleted. This action cannot be undone.
            </Drawer.Description>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              flex: '1',
              padding: '0 24px 24px',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: tokens.spacing[3],
              justifyContent: 'center',
              alignItems: 'stretch',
            }}
          >
            {/* Confirm Button (Red) - Full width on mobile, left on desktop */}
            <button
              type="button"
              onClick={handleConfirm}
              style={{
                flex: isMobile ? '0 0 auto' : '1',
                padding: '16px 32px',
                backgroundColor: '#ef4444',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: tokens.borderRadius.lg,
                fontSize: tokens.fontSize.base,
                fontWeight: tokens.fontWeight.semibold,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
                order: isMobile ? 1 : 2,
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
              }}
            >
              Yes, start over
            </button>

            {/* Cancel Button (Beige) - Full width on mobile, right on desktop */}
            <button
              type="button"
              onClick={handleCancel}
              style={{
                flex: isMobile ? '0 0 auto' : '1',
                padding: '16px 32px',
                backgroundColor: tokens.colors.button.leftHandButton,
                color: tokens.colors.primary.DEFAULT,
                border: `0.5px solid ${tokens.colors.onboarding.fontColor}`,
                borderRadius: tokens.borderRadius.lg,
                fontSize: tokens.fontSize.base,
                fontWeight: tokens.fontWeight.semibold,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
                order: isMobile ? 2 : 1,
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
              }}
              autoFocus
            >
              Cancel
            </button>
          </div>
        </Drawer.Content>
        )}
      </Drawer.Portal>
    </Drawer.Root>
  );
}

VaulStartOverDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default VaulStartOverDrawer;
