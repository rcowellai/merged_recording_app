/**
 * ErrorScreen.jsx
 * ---------------
 * Error screen component for upload failures
 * Shows user-friendly error message with retry option
 */

import React from 'react';
import { FaExclamationTriangle, FaUndo, FaTimes } from 'react-icons/fa';

const ErrorScreen = ({ errorMessage, onRetry, onCancel }) => {
  return (
    <div className="error-screen">
      <div className="error-container">
        <div className="error-icon">
          <FaExclamationTriangle size={64} color="#dc3545" />
        </div>
        
        <div className="error-content">
          <h2>Upload Failed</h2>
          <p className="error-message">
            {errorMessage || 'Something went wrong during upload. Please try again.'}
          </p>
        </div>
        
        <div className="error-actions">
          <button 
            onClick={onRetry}
            className="btn btn-primary retry-button"
          >
            <FaUndo style={{ marginRight: '8px' }} />
            Try Again
          </button>
          
          <button 
            onClick={onCancel}
            className="btn btn-secondary cancel-button"
          >
            <FaTimes style={{ marginRight: '8px' }} />
            Start Over
          </button>
        </div>
        
        <div className="error-help">
          <p>
            If this problem persists, please{' '}
            <a 
              href="https://loveretold.com/support" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              contact support
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;