/**
 * Admin Debug Page for Love Retold Upload Errors
 * ================================================
 * Read-only viewer for troubleshooting upload failures
 * Provides customer support teams with diagnostic information
 * 
 * Business Purpose:
 * - Enable quick diagnosis of upload failures without accessing production logs
 * - Identify patterns in errors (path mismatches, Firestore failures, etc.)
 * - Export error data for support tickets and escalation
 * - Clear resolved issues to maintain clean diagnostic view
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLogger from '../utils/AppLogger';

const AdminDebugPage = () => {
  const [errors, setErrors] = useState([]);
  const [selectedError, setSelectedError] = useState(null);
  const [summary, setSummary] = useState({});
  const [filter, setFilter] = useState('all'); // all, errors, warnings, info
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Load errors and summary on mount and refresh
  useEffect(() => {
    loadErrorData();
  }, [refreshKey]);

  const loadErrorData = () => {
    const allErrors = AppLogger.getErrors();
    const summaryData = AppLogger.getSummary();
    
    // Sort by timestamp (newest first)
    const sortedErrors = allErrors.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    setErrors(sortedErrors);
    setSummary(summaryData);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all error logs? This cannot be undone.')) {
      AppLogger.clearErrors();
      setErrors([]);
      setSelectedError(null);
      setSummary({});
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = () => {
    const exportData = JSON.stringify(AppLogger.exportErrors(), null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `love-retold-errors-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter errors based on level and search
  const filteredErrors = errors.filter(error => {
    // Level filter (AppLogger uses 'level' instead of 'type')
    if (filter !== 'all' && error.level !== filter) {
      return false;
    }
    
    // Search filter (adapted for AppLogger structure)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        error.source?.toLowerCase().includes(searchLower) ||
        error.message?.toLowerCase().includes(searchLower) ||
        JSON.stringify(error.data || {}).toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Get color based on error level
  const getLevelColor = (level) => {
    switch(level) {
      case 'error': return '#ff4444';
      case 'warn': return '#ffaa00';
      case 'info': return '#4444ff';
      case 'debug': return '#888888';
      default: return '#888888';
    }
  };

  // Inline styles for minimal CSS dependency
  const styles = {
    container: {
      padding: '20px',
      fontFamily: 'monospace',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    },
    header: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    title: {
      margin: '0 0 20px 0',
      fontSize: '24px',
      color: '#333'
    },
    summary: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '15px',
      marginBottom: '20px'
    },
    summaryCard: {
      backgroundColor: '#f9f9f9',
      padding: '10px',
      borderRadius: '4px',
      border: '1px solid #e0e0e0'
    },
    summaryLabel: {
      fontSize: '12px',
      color: '#666',
      marginBottom: '5px'
    },
    summaryValue: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#333'
    },
    controls: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    button: {
      padding: '8px 16px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    primaryButton: {
      backgroundColor: '#4CAF50',
      color: 'white'
    },
    dangerButton: {
      backgroundColor: '#f44336',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: '#2196F3',
      color: 'white'
    },
    filterSelect: {
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontSize: '14px'
    },
    searchInput: {
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontSize: '14px',
      width: '200px'
    },
    content: {
      display: 'flex',
      gap: '20px',
      height: 'calc(100vh - 300px)'
    },
    errorList: {
      flex: '1',
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '15px',
      overflowY: 'auto',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    errorItem: {
      padding: '12px',
      marginBottom: '10px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    errorItemSelected: {
      backgroundColor: '#e3f2fd',
      borderColor: '#2196F3'
    },
    errorItemHover: {
      backgroundColor: '#f5f5f5'
    },
    errorType: {
      display: 'inline-block',
      padding: '2px 6px',
      borderRadius: '3px',
      fontSize: '11px',
      fontWeight: 'bold',
      color: 'white',
      marginRight: '8px'
    },
    errorTimestamp: {
      fontSize: '12px',
      color: '#666',
      marginBottom: '4px'
    },
    errorSession: {
      fontSize: '12px',
      color: '#333',
      marginBottom: '4px'
    },
    errorMessage: {
      fontSize: '13px',
      color: '#444',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    errorDetails: {
      flex: '2',
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '15px',
      overflowY: 'auto',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    detailsTitle: {
      fontSize: '18px',
      marginBottom: '15px',
      color: '#333'
    },
    detailsContent: {
      backgroundColor: '#f8f8f8',
      padding: '15px',
      borderRadius: '4px',
      fontSize: '12px',
      lineHeight: '1.5',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
      overflow: 'auto'
    },
    noSelection: {
      color: '#999',
      textAlign: 'center',
      marginTop: '50px'
    },
    noErrors: {
      textAlign: 'center',
      color: '#999',
      padding: '40px'
    },
    diagnosticHighlight: {
      backgroundColor: '#ffeb3b',
      padding: '2px 4px',
      borderRadius: '2px',
      fontWeight: 'bold'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        {/* Navigation */}
        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
          <Link 
            to="/admin" 
            style={{ 
              color: 'rgba(255, 255, 255, 0.9)', 
              textDecoration: 'none', 
              fontSize: '16px',
              display: 'inline-block'
            }}
          >
            ← Back to Admin Dashboard
          </Link>
        </div>
        
        <h1 style={styles.title}>🔍 Love Retold Upload Error Debug Panel</h1>
        
        {/* Summary Statistics */}
        <div style={styles.summary}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Total Errors</div>
            <div style={styles.summaryValue}>{summary.totalErrors || 0}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Warnings</div>
            <div style={styles.summaryValue}>{summary.totalWarnings || 0}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Info Logs</div>
            <div style={styles.summaryValue}>{summary.totalInfo || 0}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Path Mismatches</div>
            <div style={styles.summaryValue}>{summary.pathMismatches || 0}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Firestore Failures</div>
            <div style={styles.summaryValue}>{summary.firestoreFailures || 0}</div>
          </div>
        </div>
        
        {/* Controls */}
        <div style={styles.controls}>
          <button 
            onClick={handleRefresh}
            style={{...styles.button, ...styles.primaryButton}}
          >
            🔄 Refresh
          </button>
          
          <button 
            onClick={handleClearAll}
            style={{...styles.button, ...styles.dangerButton}}
          >
            🗑️ Clear All
          </button>
          
          <button 
            onClick={handleExport}
            style={{...styles.button, ...styles.secondaryButton}}
          >
            📥 Export JSON
          </button>
          
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Types</option>
            <option value="error">Errors Only</option>
            <option value="warning">Warnings Only</option>
            <option value="info">Info Only</option>
          </select>
          
          <input
            type="text"
            placeholder="Search (session/user ID)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>
      
      {/* Main Content */}
      <div style={styles.content}>
        {/* Error List */}
        <div style={styles.errorList}>
          <h3>Recent Logs ({filteredErrors.length})</h3>
          
          {filteredErrors.length === 0 ? (
            <div style={styles.noErrors}>
              {errors.length === 0 ? 
                'No errors recorded. Upload errors will appear here.' :
                'No errors match your filter criteria.'
              }
            </div>
          ) : (
            filteredErrors.map((error) => (
              <div 
                key={error.id || `${error.timestamp}-${error.sessionId}`}
                onClick={() => setSelectedError(error)}
                style={{
                  ...styles.errorItem,
                  ...(selectedError === error ? styles.errorItemSelected : {})
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 
                  selectedError === error ? '#e3f2fd' : 'white'}
              >
                <div style={styles.errorTimestamp}>
                  <span 
                    style={{
                      ...styles.errorType, 
                      backgroundColor: getLevelColor(error.level)
                    }}
                  >
                    {error.level?.toUpperCase()}
                  </span>
                  {formatTimestamp(error.timestamp)}
                </div>
                <div style={styles.errorSession}>
                  Session: {error.sessionId || 'N/A'}
                  {error.pathMismatch && 
                    <span style={styles.diagnosticHighlight}> PATH MISMATCH</span>
                  }
                </div>
                <div style={styles.errorMessage}>
                  {error.message}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Error Details */}
        <div style={styles.errorDetails}>
          <h3 style={styles.detailsTitle}>Error Details</h3>
          
          {selectedError ? (
            <div>
              {/* Quick Diagnosis Section */}
              {selectedError.type === 'error' && (
                <div style={{marginBottom: '15px'}}>
                  <h4>Quick Diagnosis:</h4>
                  <ul style={{paddingLeft: '20px'}}>
                    {selectedError.pathMismatch && (
                      <li>⚠️ <strong>Path Mismatch Detected</strong> - Storage paths don't match</li>
                    )}
                    {selectedError.firestoreUpdate?.attempted && !selectedError.firestoreUpdate?.success && (
                      <li>⚠️ <strong>Firestore Update Failed</strong> - {selectedError.firestoreUpdate?.errorMessage}</li>
                    )}
                    {selectedError.fullUserId !== selectedError.truncatedUserId && (
                      <li>✅ <strong>Using Full User ID</strong> - {selectedError.fullUserId?.length} chars</li>
                    )}
                    {selectedError.currentStatus && (
                      <li>📊 <strong>Status:</strong> {selectedError.previousStatus} → {selectedError.currentStatus}</li>
                    )}
                  </ul>
                </div>
              )}
              
              {/* Full JSON Details */}
              <pre style={styles.detailsContent}>
                {JSON.stringify(selectedError, null, 2)}
              </pre>
              
              {/* Copy to Clipboard Button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedError, null, 2));
                  alert('Error details copied to clipboard');
                }}
                style={{
                  ...styles.button, 
                  ...styles.secondaryButton,
                  marginTop: '10px'
                }}
              >
                📋 Copy Details
              </button>
            </div>
          ) : (
            <div style={styles.noSelection}>
              Select an error from the list to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDebugPage;