/**
 * Console Debug Toggle Component
 * ==============================
 * Admin interface component for controlling console debugging output
 * Provides toggle control for AppLogger with error handling and diagnostics
 * 
 * Features:
 * - Clear visual toggle with current state indication
 * - Error handling and user feedback
 * - Diagnostic information display
 * - Consistent styling with admin interface
 */

import React, { useState, useEffect } from 'react';

const ConsoleDebugToggle = () => {
  // State management
  const [isEnabled, setIsEnabled] = useState(null); // null = loading
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [isChanging, setIsChanging] = useState(false);

  // Load current state on mount
  useEffect(() => {
    loadCurrentState();
  }, []);

  /**
   * Load current console debug state from AppLogger
   */
  const loadCurrentState = () => {
    try {
      if (window.AppLogger) {
        const state = window.AppLogger.getState();
        setIsEnabled(state.isEnabled);
        setIsInitialized(state.isInitialized);
        setDiagnostics(state);
        setError(null); // AppLogger handles errors internally
      } else {
        setError('AppLogger not available');
      }
    } catch (err) {
      setError(`Failed to load state: ${err.message}`);
    }
  };

  /**
   * Handle toggle state change
   */
  const handleToggle = async () => {
    if (!window.AppLogger || isChanging) {
      return;
    }

    setIsChanging(true);
    setError(null);

    try {
      const result = isEnabled 
        ? window.AppLogger.disable()
        : window.AppLogger.enable();

      if (result.success) {
        setIsEnabled(!isEnabled);
        // Reload full state to get updated diagnostics
        setTimeout(loadCurrentState, 100);
      } else {
        setError(`Toggle failed: ${result.error}`);
      }
    } catch (err) {
      setError(`Toggle error: ${err.message}`);
    } finally {
      setIsChanging(false);
    }
  };

  /**
   * Handle diagnostic refresh
   */
  const handleRefreshDiagnostics = () => {
    loadCurrentState();
  };

  /**
   * Test console methods (for admin verification)
   */
  const handleTestConsole = () => {
    try {
      console.log('🧪 Admin Test: Console.log is working');
      console.warn('🧪 Admin Test: Console.warn is working');
      console.error('🧪 Admin Test: Console.error is working');
      alert('Test console messages sent. Check browser console to verify current state.');
    } catch (err) {
      setError(`Test failed: ${err.message}`);
    }
  };

  // Styling consistent with AdminLandingPage
  const styles = {
    container: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e9ecef',
      marginBottom: '20px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '2px solid #e9ecef'
    },
    title: {
      fontSize: '1.4rem',
      fontWeight: '600',
      color: '#2a5298',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    toggleContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      padding: '15px',
      backgroundColor: isEnabled ? '#d4edda' : '#f8d7da',
      borderRadius: '8px',
      border: `2px solid ${isEnabled ? '#28a745' : '#dc3545'}`,
      marginBottom: '20px'
    },
    toggleButton: {
      position: 'relative',
      width: '60px',
      height: '32px',
      backgroundColor: isEnabled ? '#28a745' : '#6c757d',
      borderRadius: '16px',
      border: 'none',
      cursor: isChanging ? 'wait' : 'pointer',
      transition: 'all 0.3s ease',
      opacity: isChanging ? 0.7 : 1
    },
    toggleSlider: {
      position: 'absolute',
      top: '4px',
      left: isEnabled ? '32px' : '4px',
      width: '24px',
      height: '24px',
      backgroundColor: 'white',
      borderRadius: '50%',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
    },
    toggleLabel: {
      fontSize: '1.1rem',
      fontWeight: '600',
      color: isEnabled ? '#155724' : '#721c24'
    },
    description: {
      fontSize: '0.9rem',
      color: isEnabled ? '#0c4128' : '#491217',
      marginTop: '5px'
    },
    statusSection: {
      marginBottom: '20px'
    },
    statusGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '15px'
    },
    statusItem: {
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      border: '1px solid #dee2e6'
    },
    statusLabel: {
      fontSize: '0.85rem',
      fontWeight: '600',
      color: '#6c757d',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '5px'
    },
    statusValue: {
      fontSize: '1rem',
      fontWeight: '500',
      color: '#212529'
    },
    actionButtons: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      marginTop: '15px'
    },
    actionButton: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '0.9rem',
      transition: 'all 0.2s ease'
    },
    testButton: {
      backgroundColor: '#17a2b8'
    },
    refreshButton: {
      backgroundColor: '#ffc107',
      color: '#212529'
    },
    errorMessage: {
      padding: '10px',
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
      borderRadius: '6px',
      marginTop: '15px',
      fontSize: '0.9rem'
    },
    diagnosticsSection: {
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #dee2e6'
    },
    diagnosticsTitle: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#495057',
      marginBottom: '10px'
    },
    diagnosticsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '10px',
      fontSize: '0.85rem'
    },
    diagnosticsItem: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '5px 0'
    }
  };

  // Loading state
  if (isEnabled === null) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>🔧 Console Debug Control</h3>
        </div>
        <p>Loading console debug state...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>
          🔧 Console Debug Control
        </h3>
        <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
          Admin Console Management
        </div>
      </div>

      {/* Main Toggle */}
      <div style={styles.toggleContainer}>
        <button
          style={styles.toggleButton}
          onClick={handleToggle}
          disabled={isChanging}
          aria-label={`Console debugging is currently ${isEnabled ? 'enabled' : 'disabled'}. Click to ${isEnabled ? 'disable' : 'enable'}.`}
        >
          <div style={styles.toggleSlider}></div>
        </button>
        <div>
          <div style={styles.toggleLabel}>
            Console Debugging: {isEnabled ? 'ENABLED' : 'DISABLED'}
            {isChanging && ' (Changing...)'}
          </div>
          <div style={styles.description}>
            {isEnabled 
              ? 'All console output is visible. Application debugging and logging active.'
              : 'Console output is suppressed. Clean console for production-like experience.'
            }
          </div>
        </div>
      </div>

      {/* Status Information */}
      <div style={styles.statusSection}>
        <h4 style={{ color: '#495057', marginBottom: '10px' }}>System Status</h4>
        <div style={styles.statusGrid}>
          <div style={styles.statusItem}>
            <div style={styles.statusLabel}>Initialization</div>
            <div style={styles.statusValue}>
              {isInitialized ? 'Complete' : 'Pending'}
            </div>
          </div>
          <div style={styles.statusItem}>
            <div style={styles.statusLabel}>Current State</div>
            <div style={styles.statusValue}>
              {isEnabled ? 'Debug Mode' : 'Clean Console'}
            </div>
          </div>
          <div style={styles.statusItem}>
            <div style={styles.statusLabel}>Logger</div>
            <div style={styles.statusValue}>
              {window.AppLogger ? 'Available' : 'Missing'}
            </div>
          </div>
          <div style={styles.statusItem}>
            <div style={styles.statusLabel}>Storage</div>
            <div style={styles.statusValue}>
              {diagnostics?.browserSupport?.hasLocalStorage ? 'Available' : 'Unavailable'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionButtons}>
          <button
            style={{ ...styles.actionButton, ...styles.testButton }}
            onClick={handleTestConsole}
            onMouseOver={(e) => e.target.style.backgroundColor = '#138496'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#17a2b8'}
          >
            Test Console Output
          </button>
          <button
            style={{ ...styles.actionButton, ...styles.refreshButton }}
            onClick={handleRefreshDiagnostics}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e0a800'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#ffc107'}
          >
            Refresh Status
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.errorMessage}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Diagnostics Information */}
      {diagnostics && (
        <div style={styles.diagnosticsSection}>
          <h4 style={styles.diagnosticsTitle}>🔍 Diagnostic Information</h4>
          <div style={styles.diagnosticsGrid}>
            <div style={styles.diagnosticsItem}>
              <span>Browser Console:</span>
              <span>{diagnostics.browserSupport?.hasConsole ? '✅' : '❌'}</span>
            </div>
            <div style={styles.diagnosticsItem}>
              <span>localStorage:</span>
              <span>{diagnostics.browserSupport?.hasLocalStorage ? '✅' : '❌'}</span>
            </div>
            <div style={styles.diagnosticsItem}>
              <span>console.log:</span>
              <span>{diagnostics.browserSupport?.methods?.log ? '✅' : '❌'}</span>
            </div>
            <div style={styles.diagnosticsItem}>
              <span>console.error:</span>
              <span>{diagnostics.browserSupport?.methods?.error ? '✅' : '❌'}</span>
            </div>
            <div style={styles.diagnosticsItem}>
              <span>console.warn:</span>
              <span>{diagnostics.browserSupport?.methods?.warn ? '✅' : '❌'}</span>
            </div>
            <div style={styles.diagnosticsItem}>
              <span>Error Count:</span>
              <span>{diagnostics.errorCount || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #bbdefb' }}>
        <h5 style={{ color: '#1565c0', marginBottom: '10px' }}>ℹ️ Usage Instructions</h5>
        <ul style={{ color: '#1976d2', fontSize: '0.9rem', lineHeight: '1.5', paddingLeft: '20px' }}>
          <li><strong>Enable:</strong> Shows all console debugging output (useful for development and troubleshooting)</li>
          <li><strong>Disable:</strong> Suppresses console output for clean production-like experience</li>
          <li><strong>Test:</strong> Click "Test Console Output" to verify current state</li>
          <li><strong>Debug:</strong> Use browser dev tools console to see the effects</li>
          <li><strong>Note:</strong> Admin debugging interfaces (like error logs) continue working regardless of this setting</li>
        </ul>
      </div>
    </div>
  );
};

export default ConsoleDebugToggle;