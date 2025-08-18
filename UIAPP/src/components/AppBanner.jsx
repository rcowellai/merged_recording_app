/**
 * AppBanner.jsx
 * -------------
 * Configurable top banner component for the Recording App.
 * Provides a 100px (configurable) banner that adjusts all app positioning.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTokens } from '../theme/TokenProvider';
import Logo from '../Assets/Logo.png';

/**
 * AppBanner Component
 * Displays a permanent logo banner at the top of the application
 */
const AppBanner = ({ 
  logoSize = 60,  // Change this value to adjust logo size
  className = '', 
  style = {} 
}) => {
  const { tokens } = useTokens();

  // Don't render if banner is disabled in tokens
  if (!tokens.banner.enabled) {
    return null;
  }

  const bannerStyle = {
    ...style
  };

  const logoStyle = {
    height: `${logoSize}px`,
    width: 'auto',
    objectFit: 'contain',
    maxWidth: '100%',
    maxHeight: '80%', // Ensures logo doesn't exceed banner height
  };

  return (
    <div className={`app-banner ${className}`.trim()} style={bannerStyle}>
      <img 
        src={Logo} 
        alt="Love Retold Logo" 
        style={logoStyle}
      />
    </div>
  );
};

AppBanner.propTypes = {
  logoSize: PropTypes.number,
  className: PropTypes.string,
  style: PropTypes.object
};

export default AppBanner;