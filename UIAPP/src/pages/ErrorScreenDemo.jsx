/**
 * ErrorScreenDemo.jsx
 * -------------------
 * Demo page for the ErrorScreen modal overlay component
 * Shows the upload failure error UI exactly as it appears in production
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorScreen from '../components/ErrorScreen';
import AppLogger from '../utils/AppLogger';

const ErrorScreenDemo = () => {
  const navigate = useNavigate();

  AppLogger.info('ErrorScreenDemo', 'Rendering ErrorScreen modal overlay demo');

  const handleRetry = () => {
    AppLogger.info('ErrorScreenDemo', 'Retry button clicked');
    alert('In production, this would retry the upload');
    console.log('Demo: Retry action triggered - would attempt to re-upload the recording');
  };

  const handleCancel = () => {
    AppLogger.info('ErrorScreenDemo', 'Start Over button clicked');
    const shouldNavigate = window.confirm('Navigate back to home page to start over?');
    if (shouldNavigate) {
      navigate('/');
    }
  };

  // Sample error message matching production upload failure scenarios
  const sampleErrorMessage = 'Upload failed: Network connection lost. Please check your internet connection and try again.';

  // This is the actual ErrorScreen component from components/ErrorScreen.jsx
  // It renders as a full-screen modal overlay with dark background
  return (
    <ErrorScreen
      errorMessage={sampleErrorMessage}
      onRetry={handleRetry}
      onCancel={handleCancel}
    />
  );
};

export default ErrorScreenDemo;
