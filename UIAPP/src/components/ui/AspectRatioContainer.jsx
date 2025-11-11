/**
 * AspectRatioContainer.jsx
 * -------------------------
 * Modern aspect ratio preservation container using CSS aspect-ratio property.
 * Replaces inconsistent media sizing implementations across the application.
 *
 * Problem Solved:
 * - Fixed sizing: maxWidth: '500px' (non-responsive)
 * - Responsive sizing: maxWidth: 'min(500px, 100%)' (modern best practice)
 * - Inconsistent aspect ratio handling across media components
 *
 * Features:
 * - Modern CSS aspect-ratio with fallback for older browsers
 * - Responsive sizing by default
 * - Optional fixed sizing for specific use cases
 * - Composable with any media element (video, audio, images)
 *
 * Usage:
 * ```javascript
 * <AspectRatioContainer ratio="1/1" maxWidth="500px">
 *   <video style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
 * </AspectRatioContainer>
 * ```
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * AspectRatioContainer Component
 *
 * @param {Object} props
 * @param {string} props.ratio - CSS aspect-ratio value (e.g., '1/1', '16/9', '4/3')
 * @param {string} props.maxWidth - Maximum width constraint
 * @param {string} props.maxHeight - Maximum height constraint
 * @param {boolean} props.responsive - Use responsive sizing (min() function) vs fixed
 * @param {Object} props.style - Additional inline styles
 * @param {React.ReactNode} props.children - Child elements to wrap
 */
function AspectRatioContainer({
  ratio = '1/1',
  maxWidth = '500px',
  maxHeight = '500px',
  responsive = true,
  style = {},
  children
}) {
  // Check for CSS aspect-ratio support
  const supportsAspectRatio = typeof CSS !== 'undefined' && CSS.supports('aspect-ratio', '1 / 1');

  // Calculate responsive constraints using min() for viewport-aware sizing
  const responsiveMaxWidth = responsive ? `min(${maxWidth}, 100%)` : maxWidth;
  const responsiveMaxHeight = responsive ? `min(${maxHeight}, 100%)` : maxHeight;

  // Parse aspect ratio for fallback calculation
  // Example: '16/9' -> [16, 9] -> 9/16 = 0.5625 -> 56.25%
  const calculatePaddingTop = () => {
    if (supportsAspectRatio) return undefined;

    const parts = ratio.split('/').map(n => parseFloat(n.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return `${(parts[1] / parts[0]) * 100}%`;
    }
    return '100%'; // 1:1 fallback
  };

  const containerStyle = {
    width: '100%',
    maxWidth: responsiveMaxWidth,
    maxHeight: responsiveMaxHeight,
    position: 'relative',
    overflow: 'hidden',
    ...(supportsAspectRatio
      ? { aspectRatio: ratio }
      : { paddingTop: calculatePaddingTop() }
    ),
    ...style
  };

  // For fallback mode, children need absolute positioning
  const childWrapperStyle = supportsAspectRatio
    ? { width: '100%', height: '100%' }
    : {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      };

  return (
    <div style={containerStyle}>
      {supportsAspectRatio ? (
        children
      ) : (
        <div style={childWrapperStyle}>
          {children}
        </div>
      )}
    </div>
  );
}

AspectRatioContainer.propTypes = {
  ratio: PropTypes.string,
  maxWidth: PropTypes.string,
  maxHeight: PropTypes.string,
  responsive: PropTypes.bool,
  style: PropTypes.object,
  children: PropTypes.node.isRequired
};

export default AspectRatioContainer;
