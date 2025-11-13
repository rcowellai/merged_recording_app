/**
 * LoadingSpinnerDemo.jsx
 * -----------------------
 * Demo page for previewing the loading spinner / splash screen.
 * Accessible via /demo/loading route for testing and feedback.
 */

import React from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

const LoadingSpinnerDemo = () => {
  return (
    <LoadingSpinner
      message="Validating recording session..."
      size="large"
      centered={true}
    />
  );
};

export default LoadingSpinnerDemo;
