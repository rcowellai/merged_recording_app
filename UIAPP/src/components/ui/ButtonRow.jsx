/**
 * ButtonRow.jsx
 * -------------
 * Two-button layout component for side-by-side buttons.
 * Replaces two-button-row CSS pattern.
 */

import React from 'react';
import { useBreakpoint } from '../../hooks/useBreakpoint';

export function ButtonRow({ children, style = {}, ...props }) {
  const { isMobile } = useBreakpoint();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: isMobile ? '100%' : '540px',
        gap: '0%',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
