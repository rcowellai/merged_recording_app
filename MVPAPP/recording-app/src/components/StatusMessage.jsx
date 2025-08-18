import React from 'react';
import { getEnhancedSessionStatus } from '../services/session.js';

const StatusMessage = ({ 
  status, 
  message, 
  title = null, 
  actionButton = null, 
  customMessage = '',
  showDefaultActions = false 
}) => {
  // Get enhanced status object with all metadata
  const statusObj = getEnhancedSessionStatus(status, customMessage || message);
  const category = statusObj.category;
  const displayMessage = message || statusObj.message;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'expired':
        return '⏰';
      case 'removed':
        return '🗑️';
      case 'error':
        return '❌';
      case 'failed':
        return '⚠️';
      case 'invalid':
        return '🚫';
      case 'unknown':
        return '❓';
      case 'processing':
        return '⚙️';
      case 'recording':
        return '🔴';
      case 'uploading':
        return '☁️';
      case 'active':
      case 'pending':
        return '🎤';
      default:
        return 'ℹ️';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed':
        return 'status-success';
      case 'expired':
        return 'status-warning';
      case 'removed':
      case 'error':
      case 'failed':
      case 'invalid':
        return 'status-error';
      case 'unknown':
        return 'status-unknown';
      case 'processing':
      case 'recording':
      case 'uploading':
        return 'status-progress';
      case 'active':
      case 'pending':
        return 'status-ready';
      default:
        return 'status-info';
    }
  };

  const getCategoryClass = (category) => {
    return `status-${category}`;
  };

  const getCategoryIcon = (category, status) => {
    return getStatusIcon(status);
  };

  const getDefaultActionButton = (category, status) => {
    if (!showDefaultActions) return null;

    switch (category) {
      case 'error':
        if (status === 'expired') {
          return <button className="status-action-button" onClick={() => window.open('mailto:support@example.com', '_blank')}>Contact Support</button>;
        } else if (status === 'failed' || status === 'invalid') {
          return <button className="status-action-button" onClick={() => window.location.reload()}>Try Again</button>;
        }
        return <button className="status-action-button" onClick={() => window.location.reload()}>Try Again</button>;
      case 'unknown':
        return <button className="status-action-button" onClick={() => window.location.reload()}>Refresh Status</button>;
      case 'progress':
        return <button className="status-action-button" onClick={() => window.location.reload()}>Refresh Status</button>;
      default:
        return null;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'ready': return '#28a745';
      case 'completed': return '#28a745';
      case 'progress': return '#007bff';
      case 'error': return '#dc3545';
      case 'unknown': return '#6f42c1';
      default: return '#6c757d';
    }
  };

  // ========================================
  // 🚧 TEMPORARY DEBUG INFO - REMOVE AFTER TESTING 🚧
  // ========================================
  
  // Comprehensive status reference for debugging
  const getStatusReference = () => {
    return {
      // Ready States (Can Record)
      'active': {
        description: 'Session is active and ready for recording',
        userAction: 'User can start recording',
        category: 'ready',
        canRecord: true
      },
      'pending': {
        description: 'Session is pending activation but ready for recording',
        userAction: 'User can start recording (treated same as active)',
        category: 'ready', 
        canRecord: true
      },
      
      // Completed States (Cannot Record)
      'completed': {
        description: 'Recording has been successfully completed and saved',
        userAction: 'Recording finished - user cannot record again',
        category: 'completed',
        canRecord: false
      },
      
      // Progress States (Recording In Progress)
      'processing': {
        description: 'Recording is being processed/transcribed by backend',
        userAction: 'Wait for processing to complete',
        category: 'progress',
        canRecord: false
      },
      'recording': {
        description: 'Recording is currently in progress',
        userAction: 'Recording session active - cannot start new recording',
        category: 'progress',
        canRecord: false
      },
      'uploading': {
        description: 'Recording chunks are being uploaded to Firebase Storage',
        userAction: 'Wait for upload to complete',
        category: 'progress',
        canRecord: false
      },
      
      // Error States (Cannot Record - Issues)
      'expired': {
        description: 'Recording link has passed its expiration date (7 days)',
        userAction: 'Contact sender for new link',
        category: 'error',
        canRecord: false
      },
      'removed': {
        description: 'Question/prompt has been deleted by account owner',
        userAction: 'Cannot record - prompt no longer exists',
        category: 'error',
        canRecord: false
      },
      'failed': {
        description: 'Recording or upload process failed due to error',
        userAction: 'Retry recording or contact support',
        category: 'error',
        canRecord: false
      },
      'invalid': {
        description: 'Session ID format is invalid or malformed',
        userAction: 'Check link format or request new link',
        category: 'error',
        canRecord: false
      },
      'error': {
        description: 'Generic error state - something went wrong',
        userAction: 'Try again or contact support',
        category: 'error',
        canRecord: false
      },
      
      // Unknown States (Fallback)
      'unknown': {
        description: 'Status not recognized by system (edge case)',
        userAction: 'Refresh page or contact support',
        category: 'unknown',
        canRecord: false
      }
    };
  };

  const statusReference = getStatusReference();
  const currentStatusInfo = statusReference[statusObj.status] || statusReference['unknown'];

  // ========================================
  // 🚧 END TEMPORARY DEBUG INFO 🚧
  // ========================================

  const finalActionButton = actionButton || getDefaultActionButton(category, statusObj.status);
  
  return (
    <div 
      className={`status-message ${getCategoryClass(category)}`} 
      data-testid="status-message"
      data-status={statusObj.status}
      data-category={category}
      role="alert"
      aria-live="polite"
    >
      {/* ========================================
          🚧 TEMPORARY DEBUG LAYOUT - REMOVE AFTER TESTING 🚧
          ======================================== */}
      <div className="debug-layout" style={{ display: 'flex', gap: '20px', margin: '20px 0' }}>
        
        {/* Left Side: User-Facing Status */}
        <div className="user-status" style={{ flex: 1, padding: '15px', border: '2px solid #007bff', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#007bff' }}>👤 User Display</h3>
          
          <div className="status-icon" aria-hidden="true" style={{ fontSize: '24px', marginBottom: '10px' }}>
            {getCategoryIcon(category, statusObj.status)}
          </div>
          
          <div className="status-content">
            {title && (
              <h2 className="status-title" id="status-title" style={{ margin: '0 0 10px 0' }}>
                {title}
              </h2>
            )}
            <p 
              className="status-text" 
              data-testid="status-text"
              aria-labelledby={title ? "status-title" : undefined}
              style={{ margin: '0 0 15px 0', lineHeight: '1.4' }}
            >
              {displayMessage}
            </p>
            
            {finalActionButton && (
              <div className="status-actions" role="group" aria-label="Available actions">
                {finalActionButton}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Debug Information */}
        <div className="debug-status" style={{ flex: 1, padding: '15px', border: '2px solid #dc3545', borderRadius: '8px', backgroundColor: '#fff5f5' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#dc3545' }}>🔧 Debug Information</h3>
          
          {/* Raw Status from Firestore */}
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f1f3f4', borderRadius: '4px' }}>
            <strong>Raw Firestore Status:</strong> 
            <code style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#e9ecef', borderRadius: '3px' }}>
              "{status}"
            </code>
          </div>
          
          {/* Processed Status Object */}
          <div style={{ marginBottom: '15px' }}>
            <strong>Processed Status:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '14px' }}>
              <li><strong>Normalized:</strong> {statusObj.status}</li>
              <li><strong>Category:</strong> {statusObj.category}</li>
              <li><strong>Can Record:</strong> {statusObj.canRecord ? '✅ Yes' : '❌ No'}</li>
            </ul>
          </div>
          
          {/* Status Definition */}
          <div style={{ marginBottom: '15px' }}>
            <strong>Status Definition:</strong>
            <p style={{ margin: '5px 0', fontSize: '14px', fontStyle: 'italic' }}>
              {currentStatusInfo.description}
            </p>
          </div>
          
          {/* Expected User Action */}
          <div>
            <strong>Expected Action:</strong>
            <p style={{ margin: '5px 0', fontSize: '14px', color: '#6c757d' }}>
              {currentStatusInfo.userAction}
            </p>
          </div>
        </div>
      </div>
      
      {/* Status Reference Table */}
      <div style={{ margin: '20px 0', padding: '15px', border: '2px solid #28a745', borderRadius: '8px', backgroundColor: '#f8fff9' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#28a745' }}>📋 Complete Status Reference</h3>
        <div style={{ display: 'grid', gap: '10px', fontSize: '12px' }}>
          {Object.entries(statusReference).map(([statusKey, info]) => (
            <div 
              key={statusKey} 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: '80px 120px 60px 1fr 1fr', 
                gap: '10px', 
                padding: '8px',
                backgroundColor: statusKey === statusObj.status ? '#e7f3ff' : '#ffffff',
                border: statusKey === statusObj.status ? '2px solid #007bff' : '1px solid #dee2e6',
                borderRadius: '4px'
              }}
            >
              <strong>{statusKey}</strong>
              <span style={{ color: getCategoryColor(info.category) }}>{info.category}</span>
              <span>{info.canRecord ? '✅' : '❌'}</span>
              <span>{info.description}</span>
              <span style={{ color: '#6c757d' }}>{info.userAction}</span>
            </div>
          ))}
        </div>
      </div>
      {/* ======================================== 
          🚧 END TEMPORARY DEBUG LAYOUT 🚧
          ======================================== */}
    </div>
  );
};

// Export helper function for external status category checking
export const getStatusCategoryFromMessage = (status) => {
  const statusObj = getEnhancedSessionStatus(status);
  return statusObj.category;
};

export default StatusMessage;