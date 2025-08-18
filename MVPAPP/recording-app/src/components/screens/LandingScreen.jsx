import React, { useState } from 'react';
import Header from '../ui/Header';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ButtonGroup from '../ui/ButtonGroup';

const LandingScreen = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleAudioClick = () => {
    setSuccessMessage('Audio button clicked successfully!');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleVideoClick = () => {
    setSuccessMessage('Video button clicked successfully!');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="landing-screen">
      <Header />
      
      <main className="main-container">
        {/* Main Content Card */}
        <Card className="content-card">
          <div className="content-section">
            <h1 className="content-title text-xl font-semibold text-primary leading-tight">
              Robbie Asked
            </h1>
            <p className="content-description text-base text-secondary leading-normal">
              Welcome to Love Retold. Capture your precious memories and stories with our simple recording interface designed for meaningful conversations and lasting connections with loved ones.
            </p>
          </div>
        </Card>

        {/* Mode Selection Text */}
        <div className="mode-selection-text">
          Choose your recording mode
        </div>

        {/* Action Buttons */}
        <ButtonGroup className="action-buttons" orientation="horizontal" align="center">
          <Button 
            variant="primary" 
            size="lg" 
            onClick={handleAudioClick}
            className="w-full btn-audio"
          >
            Audio
          </Button>
          <Button 
            variant="primary" 
            size="lg" 
            onClick={handleVideoClick}
            className="w-full btn-video"
          >
            Video
          </Button>
        </ButtonGroup>

        {/* Success Message */}
        {showSuccess && (
          <div className="success-popup">
            <div className="success-content">
              <span className="success-icon">✓</span>
              <span className="success-text">{successMessage}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LandingScreen;