/**
 * SessionValidationErrorExpiredDemo.jsx
 * --------------------------------------
 * Demo: Session Validation Error - Expired Link
 * Shows SessionErrorScreen with 'expired' error type
 */

import React from 'react';
import SessionErrorScreen from '../components/SessionErrorScreen';

const SessionValidationErrorExpiredDemo = () => {
  return (
    <SessionErrorScreen
      errorType="expired"
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

export default SessionValidationErrorExpiredDemo;
