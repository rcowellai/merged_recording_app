/**
 * FirebaseErrorBoundaryDemo.jsx
 * ------------------------------
 * Demo: Firebase Service Error Boundary
 * Shows both production and development error screens for comparison
 */

import React, { useState } from 'react';
import ProductionErrorScreen from '../components/ProductionErrorScreen';
import DevelopmentErrorScreen from '../components/DevelopmentErrorScreen';

const FirebaseErrorBoundaryDemo = () => {
  const [mode, setMode] = useState('production');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const canRetry = retryCount < maxRetries;

  const mockError = {
    message: 'Firebase Storage: User does not have permission to access this object',
    name: 'FirebaseError',
    type: 'storage/unauthorized',
    retryable: false,
    stack: `FirebaseError: Firebase Storage: User does not have permission to access this object
    at uploadBytes (firebase-storage.js:845)
    at handleSubmit (submissionHandlers.js:67)
    at ReviewRecordingScreen (ReviewRecordingScreen.jsx:123)
    at AppContent.render (AppContent.jsx:512)`
  };

  const mockErrorInfo = {
    componentStack: `
    in RecordingFlow (at AppContent.jsx:410)
    in FirebaseErrorBoundary (at AppContent.jsx:409)
    in AppContent (at SessionValidator.jsx:283)`
  };

  const mockErrorId = 'FB-1730217845456-XYZ789ABC';

  const handleRetry = () => {
    if (canRetry) {
      setRetryCount(retryCount + 1);
      alert(`Demo: Retry clicked (${retryCount + 1}/${maxRetries})`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      {/* Toggle Controls */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 20px',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>
          Firebase Error Boundary Demo
        </h1>
        <p style={{ margin: '0 0 20px 0', color: '#666' }}>
          Compare production vs development error screens
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setMode('production')}
            style={{
              padding: '10px 20px',
              backgroundColor: mode === 'production' ? '#3A754B' : '#e0e0e0',
              color: mode === 'production' ? 'white' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: mode === 'production' ? 'bold' : 'normal',
              fontSize: '14px'
            }}
          >
            Production View
          </button>

          <button
            onClick={() => setMode('development')}
            style={{
              padding: '10px 20px',
              backgroundColor: mode === 'development' ? '#d63031' : '#e0e0e0',
              color: mode === 'development' ? 'white' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: mode === 'development' ? 'bold' : 'normal',
              fontSize: '14px'
            }}
          >
            Development View
          </button>
        </div>

        <div style={{
          marginTop: '15px',
          padding: '12px',
          backgroundColor: mode === 'production' ? '#e8f5e9' : '#fff3cd',
          border: `1px solid ${mode === 'production' ? '#4caf50' : '#ffc107'}`,
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {mode === 'production' ? (
            <>
              <strong>Production Mode:</strong> Generic user-friendly message, no technical details exposed.
              This is what end users see in production builds.
            </>
          ) : (
            <>
              <strong>Development Mode:</strong> Full error details with Firebase context for debugging.
              This is what developers see when running locally.
            </>
          )}
        </div>
      </div>

      {/* Error Screen Display */}
      {mode === 'production' ? (
        <ProductionErrorScreen
          errorId={mockErrorId}
          onRetry={canRetry ? handleRetry : null}
          onGoHome={() => alert('Demo: Go Home clicked')}
          showRetry={canRetry}
        />
      ) : (
        <DevelopmentErrorScreen
          error={mockError}
          errorInfo={mockErrorInfo}
          errorId={mockErrorId}
          errorType="Firebase"
          onRetry={canRetry ? handleRetry : null}
        />
      )}
    </div>
  );
};

export default FirebaseErrorBoundaryDemo;
