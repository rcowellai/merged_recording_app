/**
 * ScrollContainer.jsx
 * -------------------
 * Standardized overflow handling container that eliminates inconsistent
 * overflow strategies across the application.
 *
 * Problem Solved:
 * - MasterLayout Section B: overflow: 'visible'
 * - VideoTest/ReviewRecording/AudioTest: overflow: 'hidden'
 * - ErrorScreen/SessionErrorScreen: overflow: 'auto'
 * - PlyrMediaPlayer: Mixed 'visible' and 'hidden'
 *
 * Features:
 * - Consistent overflow behavior across all screens
 * - Integrates with useResponsiveLayout hook
 * - Predictable scrolling and content accessibility
 * - Composable with AspectRatioContainer
 *
 * Usage:
 * ```javascript
 * const layout = useResponsiveLayout({ section: 'content' });
 *
 * <ScrollContainer overflow="auto" style={layout}>
 *   {children}
 * </ScrollContainer>
 * ```
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * ScrollContainer Component
 *
 * @param {Object} props
 * @param {string} props.overflow - Overflow behavior: 'auto' | 'hidden' | 'visible' | 'scroll'
 * @param {Object} props.style - Additional inline styles (typically from useResponsiveLayout)
 * @param {string} props.className - Optional CSS class name
 * @param {React.ReactNode} props.children - Child elements
 */
function ScrollContainer({
  overflow = 'auto',
  style = {},
  className = '',
  children
}) {
  const containerStyle = {
    overflow,
    boxSizing: 'border-box',
    ...style
  };

  return (
    <div style={containerStyle} className={className}>
      {children}
    </div>
  );
}

ScrollContainer.propTypes = {
  overflow: PropTypes.oneOf(['auto', 'hidden', 'visible', 'scroll']),
  style: PropTypes.object,
  className: PropTypes.string,
  children: PropTypes.node
};

export default ScrollContainer;
