/**
 * index.js
 * --------
 * The React entry point that renders the root of the
 * application. Sets up <BrowserRouter> and defines
 * the top-level routes for:
 *   - "/" => App
 *   - "/view/:docId" => ViewRecording
 *   - "/admin" => AdminPage
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NiceModal from '@ebay/nice-modal-react';
import * as Sentry from "@sentry/react";
import AppErrorBoundary from './components/AppErrorBoundary';
import debugLogger from './utils/debugLogger';
import App from './App';
import ViewRecording from './pages/ViewRecording';
import AdminPage from './pages/AdminPage';
import AdminLandingPage from './components/AdminLandingPage';
import AdminDebugPage from './components/AdminDebugPage';
import DatabaseAdminPage from './components/DatabaseAdminPage';
import { TokenProvider } from './theme/TokenProvider';
import { GlobalStyles } from './theme/GlobalStyles';
import ErrorScreenDemo from './pages/ErrorScreenDemo';
import SessionValidationErrorDemo from './pages/SessionValidationErrorDemo';
import SessionValidationErrorExpiredDemo from './pages/SessionValidationErrorExpiredDemo';
import SessionValidationErrorNetworkDemo from './pages/SessionValidationErrorNetworkDemo';
import CameraPermissionErrorDemo from './pages/CameraPermissionErrorDemo';
import MicrophonePermissionErrorDemo from './pages/MicrophonePermissionErrorDemo';
import AppErrorBoundaryDemo from './pages/AppErrorBoundaryDemo';
import FirebaseErrorBoundaryDemo from './pages/FirebaseErrorBoundaryDemo';

// Initialize Sentry for error tracking (production only)
if (process.env.REACT_APP_SENTRY_DSN && process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || process.env.NODE_ENV,

    // Send default PII (IP address, user agent, etc.)
    sendDefaultPii: process.env.REACT_APP_SENTRY_SEND_DEFAULT_PII === 'true',

    // Performance Monitoring
    tracesSampleRate: parseFloat(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE || '0.1'),

    // Session Replay (optional - captures user sessions)
    // replaysSessionSampleRate: 0.1, // 10% of sessions
    // replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Sanitize sensitive data before sending
    beforeSend(event, hint) {
      // Remove sensitive query parameters from URLs
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          const sensitiveParams = ['token', 'apiKey', 'password', 'secret', 'key'];
          sensitiveParams.forEach(param => {
            if (url.searchParams.has(param)) {
              url.searchParams.set(param, '[REDACTED]');
            }
          });
          event.request.url = url.toString();
        } catch (e) {
          // Invalid URL, keep original
        }
      }
      return event;
    },

    // Add context to all errors
    initialScope: {
      tags: {
        app: 'love-retold-recorder',
        version: process.env.REACT_APP_VERSION || '1.0.0'
      }
    }
  });

  debugLogger.log('info', 'Sentry', 'Initialized for production error tracking');
} 

debugLogger.log('info', 'index.js', 'Starting React app render');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // NOTE: StrictMode disabled - causes AudioMotionAnalyzer double mount/destroy cycle
  // The visualizer canvas gets destroyed during StrictMode's intentional unmount/remount
  <AppErrorBoundary>
    <TokenProvider>
      <GlobalStyles />
      <NiceModal.Provider>
        <BrowserRouter>
        <Routes>
          {/* Love Retold session routes - handle both path and query params */}
          <Route path="/:sessionId" element={<App />} />
          <Route path="/" element={<App />} />

          {/* Existing route => playback page */}
          <Route path="/view/:docId" element={<ViewRecording />} />

          {/* Admin Dashboard - Navigation Hub */}
          <Route path="/admin" element={<AdminLandingPage />} />

          {/* Admin Sub-Pages */}
          <Route path="/admin/recordings" element={<AdminPage />} />
          <Route path="/admin/debug" element={<AdminDebugPage />} />
          <Route path="/admin/database" element={<DatabaseAdminPage />} />

          {/* Error Screen Demos */}
          <Route path="/demo/error/upload" element={<ErrorScreenDemo />} />
          <Route path="/demo/error/session" element={<SessionValidationErrorDemo />} />
          <Route path="/demo/error/session-expired" element={<SessionValidationErrorExpiredDemo />} />
          <Route path="/demo/error/session-network" element={<SessionValidationErrorNetworkDemo />} />
          <Route path="/demo/error/camera" element={<CameraPermissionErrorDemo />} />
          <Route path="/demo/error/microphone" element={<MicrophonePermissionErrorDemo />} />
          <Route path="/demo/error/app-crash" element={<AppErrorBoundaryDemo />} />
          <Route path="/demo/error/firebase" element={<FirebaseErrorBoundaryDemo />} />
        </Routes>
        </BrowserRouter>
      </NiceModal.Provider>
    </TokenProvider>
  </AppErrorBoundary>
);
