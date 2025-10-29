/**
 * SessionValidationErrorDemo.jsx
 * -------------------------------
 * Demo: Session Validation Error (inline error page)
 * From: SessionValidator.jsx:248-273
 */

import React from 'react';

const SessionValidationErrorDemo = () => {
  const error = 'Invalid recording link format. This recording link appears to be corrupted or expired.';

  return (
    <div className="app-container">
      <div className="error-container">
        <h2>Recording Session Error</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Try Again
          </button>
          <a
            href="https://loveretold.com"
            className="btn btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Love Retold
          </a>
        </div>
      </div>
    </div>
  );
};

export default SessionValidationErrorDemo;
