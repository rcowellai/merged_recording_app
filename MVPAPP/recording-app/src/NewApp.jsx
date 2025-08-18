import React, { useState } from 'react';
import LandingScreen from './components/screens/LandingScreen';
import App from './App'; // Original App component

// Import new design system styles
import './styles/design-system.css';
import './styles/components.css';

const NewApp = () => {
  const [currentView, setCurrentView] = useState('new'); // 'new' or 'original'
  
  const toggleView = () => {
    setCurrentView(currentView === 'new' ? 'original' : 'new');
  };

  return (
    <>
      {/* Development Toggle Button */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 9999,
        backgroundColor: '#2D2F46',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        border: 'none'
      }} onClick={toggleView}>
        Switch to {currentView === 'new' ? 'Original' : 'New Design'}
      </div>

      {/* Render current view */}
      {currentView === 'new' ? (
        <LandingScreen />
      ) : (
        <App />
      )}
    </>
  );
};

export default NewApp;