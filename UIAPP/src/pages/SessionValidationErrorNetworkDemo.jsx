/**
 * SessionValidationErrorNetworkDemo.jsx
 * --------------------------------------
 * Demo: Session Validation Error - Network Issue
 * Shows SessionErrorScreen with 'network' error type
 */

import React from 'react';
import SessionErrorScreen from '../components/SessionErrorScreen';

const SessionValidationErrorNetworkDemo = () => {
  return (
    <SessionErrorScreen
      errorType="network"
      onRetry={() => {
        console.log('Demo: Try Again clicked');
        alert('In production, this would reload the page');
      }}
      onGoHome={() => {
        console.log('Demo: Go Home clicked');
        alert('In production, this would navigate to Love Retold homepage');
      }}
    />
  );
};

export default SessionValidationErrorNetworkDemo;
