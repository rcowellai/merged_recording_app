/**
 * AppErrorBoundaryDemo.jsx
 * -------------------------
 * Demo: React Error Boundary (App Crash Handler)
 * Shows both production and development error screens for comparison
 */

import React, { useState } from 'react';
import ProductionErrorScreen from '../components/ProductionErrorScreen';
import DevelopmentErrorScreen from '../components/DevelopmentErrorScreen';

const AppErrorBoundaryDemo = () => {
  const [mode, setMode] = useState('production');

  const mockError = {
    message: 'Cannot read property "data" of undefined',
    name: 'TypeError',
    stack: `TypeError: Cannot read property 'data' of undefined
    at RecordingFlow.render (RecordingFlow.jsx:234:15)
    at finishClassComponent (react-dom.development.js:17485)
    at updateClassComponent (react-dom.development.js:17435)
    at performUnitOfWork (react-dom.development.js:19073)
    at workLoopSync (react-dom.development.js:18999)`
  };

  const mockErrorInfo = {
    componentStack: `
    in RecordingFlow (at AppContent.jsx:456)
    in AppContent (at SessionValidator.jsx:283)
    in SessionValidator (at App.js:55)
    in App (at index.js:49)
    in ErrorBoundary (at index.js:45)`
  };

  const mockErrorId = 'APP-1730217845123-ABC123XYZ';

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
          App Error Boundary Demo
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
              <strong>Development Mode:</strong> Full error details with stack traces for debugging.
              This is what developers see when running locally.
            </>
          )}
        </div>
      </div>

      {/* Error Screen Display */}
      {mode === 'production' ? (
        <ProductionErrorScreen
          errorId={mockErrorId}
          onRetry={() => alert('Demo: Retry clicked')}
          onGoHome={() => alert('Demo: Go Home clicked')}
          showRetry={true}
        />
      ) : (
        <DevelopmentErrorScreen
          error={mockError}
          errorInfo={mockErrorInfo}
          errorId={mockErrorId}
          errorType="App"
        />
      )}
    </div>
  );
};

export default AppErrorBoundaryDemo;
