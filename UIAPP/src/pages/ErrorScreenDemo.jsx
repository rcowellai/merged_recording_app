/**
 * ErrorScreenDemo.jsx
 * -------------------
 * Demo page for the ErrorScreen component
 * Shows the error UI exactly as it appears in production
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorScreen from '../components/ErrorScreen';
import AppLogger from '../utils/AppLogger';

const ErrorScreenDemo = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    AppLogger.info('ErrorScreenDemo', 'Retry button clicked');
    alert('Retry button clicked - In production, this would retry the upload');
    console.log('Demo: Retry action triggered');
  };

  const handleCancel = () => {
    AppLogger.info('ErrorScreenDemo', 'Cancel/Start Over button clicked');
    const shouldNavigate = window.confirm('Navigate back to home page?');
    if (shouldNavigate) {
      navigate('/');
    }
  };

  // Sample error message matching production scenarios
  const sampleErrorMessage = 'Upload failed: Network connection lost. Please check your internet connection and try again.';

  return (
    <ErrorScreen
      errorMessage={sampleErrorMessage}
      onRetry={handleRetry}
      onCancel={handleCancel}
    />
  );
};

export default ErrorScreenDemo;
