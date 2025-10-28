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
import AppErrorBoundary from './components/AppErrorBoundary';
import debugLogger from './utils/debugLogger';

import App from './App';

// Import your ViewRecording page
import ViewRecording from './pages/ViewRecording';

// Import admin components
import AdminPage from './pages/AdminPage';
import AdminLandingPage from './components/AdminLandingPage';
import AdminDebugPage from './components/AdminDebugPage';
import DatabaseAdminPage from './components/DatabaseAdminPage';

// Import TokenProvider for design tokens
import { TokenProvider } from './theme/TokenProvider';
import { GlobalStyles } from './theme/GlobalStyles'; 

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
        </Routes>
        </BrowserRouter>
      </NiceModal.Provider>
    </TokenProvider>
  </AppErrorBoundary>
);
