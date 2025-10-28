/**
 * ButtonRow.jsx
 * -------------
 * Two-button layout component for side-by-side buttons.
 * Replaces two-button-row CSS pattern.
 */

import React from 'react';

export function ButtonRow({ children, style = {}, ...props }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        gap: '0%',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
