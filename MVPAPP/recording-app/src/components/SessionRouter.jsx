import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SessionValidator from './SessionValidator.jsx';
import StatusMessage from './StatusMessage.jsx';
import { extractSessionIdFromUrl, parseSessionId, validateSessionId } from '../utils/sessionParser.js';

/**
 * Love Retold Session Router - Handles URL parameter-based sessions
 * URL Format: ?session=abc7d9f-firstdat-user123a-uncle456-1736604000
 */
const SessionRouter = () => {
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState(null);
  const [sessionComponents, setSessionComponents] = useState(null);
  const [sessionError, setSessionError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeSession = () => {
      try {
        // Extract session ID from URL parameters
        const sessionParam = searchParams.get('session');
        
        if (!sessionParam) {
          setSessionError({
            type: 'NO_SESSION',
            message: 'No recording session found. Please use the link provided by Love Retold.',
            details: 'URL should contain ?session=... parameter'
          });
          setIsLoading(false);
          return;
        }
        
        console.log('📋 Parsing Love Retold SESSION_ID:', sessionParam);
        
        // Validate session ID format
        if (!validateSessionId(sessionParam)) {
          setSessionError({
            type: 'INVALID_FORMAT',
            message: 'Invalid recording link format.',
            details: 'This recording link appears to be corrupted or expired. Please contact the sender for a new link.'
          });
          setIsLoading(false);
          return;
        }
        
        // Parse session ID components
        const components = parseSessionId(sessionParam);
        console.log('🔍 Session components parsed:', {
          userId: components.userId,
          promptId: components.promptId,
          storytellerId: components.storytellerId,
          timestamp: new Date(components.timestamp * 1000).toISOString()
        });
        
        setSessionId(sessionParam);
        setSessionComponents(components);
        setSessionError(null);
        
      } catch (error) {
        console.error('❌ Session initialization failed:', error);
        setSessionError({
          type: 'PARSE_ERROR',
          message: 'Unable to process recording link.',
          details: error.message
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeSession();
  }, [searchParams]);

  // Loading state
  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading-session">
          <h1 className="app-title">Love Retold</h1>
          <p>Preparing your recording session...</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  // Error states
  if (sessionError) {
    const getActionButton = () => {
      switch (sessionError.type) {
        case 'NO_SESSION':
          return (
            <a 
              href="https://loveretold.com" 
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Love Retold
            </a>
          );
        case 'INVALID_FORMAT':
        case 'PARSE_ERROR':
          return (
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-secondary"
            >
              Try Again
            </button>
          );
        default:
          return (
            <button 
              onClick={() => window.history.back()}
              className="btn btn-secondary"
            >
              Go Back
            </button>
          );
      }
    };

    return (
      <StatusMessage
        status="error"
        title="Recording Link Issue"
        message={sessionError.message}
        details={sessionError.details}
        actionButton={getActionButton()}
      />
    );
  }

  // Success - pass to SessionValidator with Love Retold components
  if (sessionId && sessionComponents) {
    return (
      <SessionValidator 
        sessionId={sessionId} 
        sessionComponents={sessionComponents}
      />
    );
  }

  // Fallback error
  return (
    <StatusMessage
      status="error"
      title="Unexpected Error"
      message="Something went wrong while processing your recording link."
      actionButton={
        <button 
          onClick={() => window.location.reload()}
          className="btn btn-secondary"
        >
          Reload Page
        </button>
      }
    />
  );
};

export default SessionRouter;