/**
 * App.jsx
 * -------
 * Main app component for Love Retold Recording App
 * Now integrated with index.js router - no nested BrowserRouter
 */

import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import SessionValidator from './components/SessionValidator.jsx';
import { extractSessionIdFromUrl } from './utils/sessionParser.js';
import AppLogger from './utils/AppLogger.js';

function App() {
  AppLogger.lifecycle('App', 'mounted');
  const { sessionId } = useParams();
  const location = useLocation();
  
  AppLogger.info('App', 'App initializing', {
    currentUrl: window.location.href,
    userAgent: navigator.userAgent,
    sessionIdFromParams: sessionId,
    pathname: location.pathname
  });
  
  // Log route changes
  useEffect(() => {
    AppLogger.info('Router', 'Route changed', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      fullUrl: window.location.href,
      sessionIdFromParams: sessionId
    });
  }, [location, sessionId]);

  // Initialize AppLogger after app startup is complete
  useEffect(() => {
    // Defer initialization to ensure all initial app logging completes first
    const initTimeout = setTimeout(() => {
      try {
        AppLogger.deferredInit();
        AppLogger.info('App', 'AppLogger deferred initialization complete');
      } catch (error) {
        AppLogger.error('App', 'AppLogger initialization failed', { error: error.message }, error);
      }
    }, 100); // Small delay to ensure all synchronous logging is complete

    return () => clearTimeout(initTimeout);
  }, []);

  // If we have a sessionId from path params, use SessionValidator
  if (sessionId) {
    AppLogger.info('App', 'Session ID found in path params, using SessionValidator', { sessionId });
    return <SessionValidator />;
  }

  // Check for query parameters
  const querySessionId = extractSessionIdFromUrl();
  AppLogger.info('App', 'Checking query parameters', { querySessionId });
  
  if (querySessionId) {
    AppLogger.info('App', 'Session ID found in query params, redirecting', { querySessionId });
    // Redirect to path-based URL
    window.location.href = `/${querySessionId}`;
    return null;
  }

  // No session found, show info page
  AppLogger.info('App', 'No session found, showing info page');
  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">Love Retold Recording</h1>
        <p>Audio & Video Memory Capture</p>
      </div>
      
      <div className="app-navigation">
        <div className="nav-section">
          <h3>Recording</h3>
          <p>To record a memory, you need a valid recording link from Love Retold.</p>
          <a
            href="https://loveretold.com"
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Love Retold
          </a>
        </div>

        <div className="nav-section">
          <h3>Test Recording</h3>
          <p>Test the recording interface with a sample session.</p>
          <a
            href="/?sessionId=test-session-123"
            className="btn btn-secondary"
          >
            Test Recording
          </a>
        </div>

        <div className="nav-section">
          <h3>Screen Demos</h3>
          <p>Preview loading and error screens for testing and design purposes.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a href="/demo/loading" className="btn btn-secondary">
              Loading Spinner / Splash Screen
            </a>
            <a href="/demo/error/upload" className="btn btn-secondary">
              1. Upload Failure Error
            </a>
            <a href="/demo/error/session" className="btn btn-secondary">
              2. Session Error - Invalid Link
            </a>
            <a href="/demo/error/session-expired" className="btn btn-secondary">
              3. Session Error - Expired Link
            </a>
            <a href="/demo/error/session-network" className="btn btn-secondary">
              4. Session Error - Network Issue
            </a>
            <a href="/demo/error/camera" className="btn btn-secondary">
              5. Camera Permission Denied
            </a>
            <a href="/demo/error/microphone" className="btn btn-secondary">
              6. Microphone Permission Denied
            </a>
            <a href="/demo/error/app-crash" className="btn btn-secondary">
              7. App Error Boundary
            </a>
            <a href="/demo/error/firebase" className="btn btn-secondary">
              8. Firebase Service Error
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;