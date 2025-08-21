import React from 'react';
import debugLogger from '../utils/debugLogger.js';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    debugLogger.componentMounted('AppErrorBoundary');
  }

  static getDerivedStateFromError(error) {
    debugLogger.log('error', 'AppErrorBoundary', 'getDerivedStateFromError called', { error: error.message }, error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    debugLogger.componentError('AppErrorBoundary', error, {
      errorInfo,
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });
    
    this.setState({
      error,
      errorInfo
    });

    // Log to console for debugging
    console.error('🚨 React Error Boundary caught error:', error);
    console.error('🚨 Error Info:', errorInfo);
    console.error('🚨 Component Stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      debugLogger.log('error', 'AppErrorBoundary', 'Rendering error fallback UI');
      
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
            🚨 Application Error
          </h2>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Error:</strong> {this.state.error?.message || 'Unknown error'}
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Current URL:</strong> {window.location.href}
          </div>
          
          <details style={{ marginBottom: '15px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Error Details (Click to expand)
            </summary>
            <pre style={{
              background: '#f8f8f8',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
              marginTop: '10px'
            }}>
              {this.state.error?.stack}
            </pre>
          </details>
          
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
              marginTop: '10px'
            }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          
          <div style={{ marginTop: '20px' }}>
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
            💡 <strong>Debug Help:</strong> Check the browser console for additional debug messages starting with 🐛
          </div>
        </div>
      );
    }

    debugLogger.log('info', 'AppErrorBoundary', 'Rendering children - no errors');
    return this.props.children;
  }
}

export default AppErrorBoundary;