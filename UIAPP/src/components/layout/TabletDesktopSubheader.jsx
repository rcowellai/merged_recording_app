/**
 * TabletDesktopSubheader.jsx
 * ---------------------------
 * Secondary header section (B1) for tablet and desktop layouts.
 * Appears below the main LayoutHeader on larger screens.
 *
 * Layout: B1A (back button) | B1B (content) | B1C (icon)
 *
 * Important: This component should NOT render on mobile.
 * The parent component should handle the conditional rendering.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { MdChevronLeft } from 'react-icons/md';
import { useTokens } from '../../theme/TokenProvider';

function TabletDesktopSubheader({
  showBackButton = true,
  onBack = null,
  content = null,
  iconA3 = null
}) {
  const { tokens } = useTokens();

  return (
    <div style={{
      flex: '0 0 70px',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxSizing: 'border-box'
    }}>
      {/* B1A - Left slot (45px) - Back button */}
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
            size={38}
            color={tokens.colors.primary.DEFAULT}
            onClick={onBack}
            style={{ cursor: 'pointer' }}
          />
        )}
      </div>

      {/* B1B - Center flexible content */}
      <div style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        boxSizing: 'border-box',
        color: tokens.colors.primary.DEFAULT,
        fontWeight: tokens.fontWeight.normal,
        fontSize: tokens.fontSize['2xl'] // 24px - matches mobile Section A2
      }}>
        {content}
      </div>

      {/* B1C - Right slot (45px) - Icon */}
      <div style={{
        flex: '0 0 45px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}>
        <div style={{ transform: 'scale(1.2)' }}>
          {iconA3}
        </div>
      </div>
    </div>
  );
}

TabletDesktopSubheader.propTypes = {
  showBackButton: PropTypes.bool,
  onBack: PropTypes.func,
  content: PropTypes.node,
  iconA3: PropTypes.node
};

export default TabletDesktopSubheader;
