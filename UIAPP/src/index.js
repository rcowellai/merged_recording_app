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

import App from './App';
import './styles/index.css';

// Import your ViewRecording page
import ViewRecording from './pages/ViewRecording';

// Import your new AdminPage
import AdminPage from './pages/AdminPage';

// Import TokenProvider and TokenAdmin
import { TokenProvider } from './theme/TokenProvider';
import { LayoutProvider } from './components/layout';
import TokenAdmin from './pages/TokenAdmin';
import DemoPage from './pages/DemoPage'; 

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TokenProvider>
      <LayoutProvider>
        <NiceModal.Provider>
          <BrowserRouter>
            <Routes>
              {/* Existing root path => main record/submit flow */}
              <Route path="/" element={<App />} />

              {/* Existing route => playback page */}
              <Route path="/view/:docId" element={<ViewRecording />} />

              {/* NEW: Admin route => /admin */}
              <Route path="/admin" element={<AdminPage />} />

              {/* NEW: Token admin route => /admin/tokens */}
              <Route path="/admin/tokens" element={<TokenAdmin />} />

              {/* NEW: Demo page => /demo */}
              <Route path="/demo" element={<DemoPage />} />
            </Routes>
          </BrowserRouter>
        </NiceModal.Provider>
      </LayoutProvider>
    </TokenProvider>
  </React.StrictMode>
);
