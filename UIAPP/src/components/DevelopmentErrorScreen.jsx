/**
 * DevelopmentErrorScreen.jsx
 * ---------------------------
 * Detailed error screen for development mode
 * Shows full stack traces, component stacks, and debugging info
 *
 * PURPOSE:
 * Provides comprehensive error details for developers during local development.
 * Includes all technical information needed for debugging and troubleshooting.
 *
 * FEATURES:
 * - Full error stack traces
 * - Component stack visualization
 * - Error ID tracking
 * - Current URL display
 * - Collapsible details sections
 * - Development mode indicator
 *
 * USED BY:
 * - AppErrorBoundary (when NODE_ENV === 'development')
 * - FirebaseErrorBoundary (when NODE_ENV === 'development')
 *
 * SECURITY:
 * - Only rendered in development mode
 * - Never shown to production users
 * - Full technical details safe to expose locally
 */

import React from 'react';

const DevelopmentErrorScreen = ({
  error,
  errorInfo,
  errorId,
  errorType = 'App',
  onRetry
}) => {
  return (
    <div style={{
      padding: '20px',
      margin: '20px',
      border: '2px solid #ff6b6b',
      borderRadius: '8px',
      backgroundColor: '#ffe0e0',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2 style={{ color: '#d63031', margin: '0 0 15px 0' }}>
        🚨 {errorType} Error (Development Mode)
      </h2>

      <div style={{ marginBottom: '15px' }}>
        <strong>Error:</strong> {error?.message || 'Unknown error'}
      </div>

      {errorId && (
        <div style={{ marginBottom: '15px' }}>
          <strong>Error ID:</strong> {errorId}
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <strong>Current URL:</strong> {window.location.href}
      </div>

      <details style={{ marginBottom: '15px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
          Error Stack (Click to expand)
        </summary>
        <pre style={{
          background: '#f8f8f8',
          padding: '10px',
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '12px',
          marginTop: '10px',
          maxHeight: '300px'
        }}>
          {error?.stack || 'No stack trace available'}
        </pre>
      </details>

      {errorInfo?.componentStack && (
        <details style={{ marginBottom: '15px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
            Component Stack (Click to expand)
          </summary>
          <pre style={{
            background: '#f8f8f8',
            padding: '10px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px',
            marginTop: '10px',
            maxHeight: '300px'
          }}>
            {errorInfo.componentStack}
          </pre>
        </details>
      )}

      <div style={{ marginTop: '20px' }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0984e3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Retry
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0984e3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Reload Page
        </button>

        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Go Home
        </button>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        💡 <strong>Development Mode:</strong> This detailed error screen is only shown in development.
        Production users will see a generic error message without technical details.
      </div>
    </div>
  );
};

export default DevelopmentErrorScreen;
