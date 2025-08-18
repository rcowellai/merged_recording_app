import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  validateSession, 
  getSessionStatusMessage, 
  getEnhancedSessionStatus,
  canRecord, 
  getStatusCategory,
  isErrorStatus
} from '../services/session.js';
import { parseSessionId, validateSessionId } from '../utils/sessionParser.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import StatusMessage from './StatusMessage.jsx';
import EnhancedRecordingInterface from './EnhancedRecordingInterface.jsx';

const SessionValidator = ({ sessionId: propSessionId, sessionComponents: propSessionComponents }) => {
  const { sessionId: paramSessionId } = useParams();
  const sessionId = propSessionId || paramSessionId; // Support both prop and URL parameter
  const [sessionData, setSessionData] = useState(null);
  const [sessionComponents, setSessionComponents] = useState(propSessionComponents);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Parse session components if not provided (from URL parameter)
        if (!propSessionComponents && sessionId) {
          try {
            if (!validateSessionId(sessionId)) {
              setError('Invalid recording link format. This recording link appears to be corrupted or expired.');
              setLoading(false);
              return;
            }
            const parsedComponents = parseSessionId(sessionId);
            setSessionComponents(parsedComponents);
            console.log('🔍 Session components parsed from URL:', {
              userId: parsedComponents.userId,
              promptId: parsedComponents.promptId,
              storytellerId: parsedComponents.storytellerId
            });
          } catch (parseError) {
            console.error('❌ Session parsing failed:', parseError);
            setError('Unable to process recording link. Please contact the sender for a new link.');
            setLoading(false);
            return;
          }
        }
        
        // validateSession now handles all error cases and timeouts internally
        const data = await validateSession(sessionId);
        
        setSessionData(data);
        
        // Check if the validation returned an error status using enhanced detection
        if (isErrorStatus(data.status)) {
          setError(data.message);
        }
      } catch (error) {
        console.error('Unexpected error in session validation:', error);
        // This should not happen since validateSession always returns an object,
        // but handle it just in case
        setError('Unable to validate session. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId, propSessionComponents]);

  // Loading state
  if (loading) {
    return (
      <div className="session-validator">
        <LoadingSpinner 
          message="Validating recording session..." 
          size="large" 
        />
      </div>
    );
  }

  // Error state - use enhanced status handling
  if (error) {
    return (
      <div className="session-validator">
        <StatusMessage
          status="error"
          title="Session Error"
          message={error}
          showDefaultActions={true}
        />
      </div>
    );
  }

  // No session data - treat as invalid
  if (!sessionData) {
    return (
      <div className="session-validator">
        <StatusMessage
          status="invalid"
          title="Invalid Session"
          message="No session data available"
          showDefaultActions={true}
        />
      </div>
    );
  }

  // Active session - show recording interface
  if (canRecord(sessionData.status)) {
    return (
      <div className="session-validator">
        <EnhancedRecordingInterface 
          sessionData={sessionData}
          sessionId={sessionId}
          sessionComponents={sessionComponents}
        />
      </div>
    );
  }

  // Other session states (completed, expired, removed, etc.)
  // Use enhanced status system for intelligent title and action generation
  const statusObj = getEnhancedSessionStatus(sessionData.status, sessionData.message);
  
  const getStatusTitle = (status, category) => {
    const titles = {
      // Completed states
      completed: 'Memory Recorded',
      
      // Error states
      expired: 'Link Expired',
      removed: 'Question Removed',
      failed: 'Recording Failed', 
      invalid: 'Invalid Session',
      error: 'Session Error',
      
      // Progress states
      processing: 'Processing Recording',
      recording: 'Recording in Progress',
      uploading: 'Uploading Recording',
      
      // Unknown states
      unknown: 'Session Status Unknown'
    };
    
    return titles[status] || `Session ${category.charAt(0).toUpperCase() + category.slice(1)}`;
  };

  return (
    <div className="session-validator">
      <StatusMessage
        status={sessionData.status}
        title={getStatusTitle(statusObj.status, statusObj.category)}
        message={statusObj.message}
        customMessage={sessionData.message}
        showDefaultActions={true}
      />
    </div>
  );
};

export default SessionValidator;