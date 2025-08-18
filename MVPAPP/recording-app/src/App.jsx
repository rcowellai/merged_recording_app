import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import SessionValidator from './components/SessionValidator.jsx';
import SessionRouter from './components/SessionRouter.jsx';
import StoryDisplay from './components/StoryDisplay.jsx';
import StatusMessage from './components/StatusMessage.jsx';
import './styles/main.css';

// Component to handle the story display route
const StoryDisplayPage = () => {
  const { userId } = useParams();
  
  if (!userId) {
    return (
      <div className="app-container">
        <StatusMessage
          status="error"
          title="Invalid Request"
          message="User ID is required to view stories."
          actionButton={
            <button 
              onClick={() => window.history.back()}
              className="btn btn-secondary"
            >
              Go Back
            </button>
          }
        />
      </div>
    );
  }
  
  return <StoryDisplay userId={userId} />;
};

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Love Retold primary route - path parameter based */}
          <Route 
            path="/record/:sessionId" 
            element={<SessionValidator />} 
          />
          
          {/* Session ID at root level (Love Retold compatibility) */}
          <Route 
            path="/:sessionId" 
            element={<SessionValidator />} 
          />
          
          {/* Legacy query parameter route - backward compatibility */}
          <Route 
            path="/" 
            element={<SessionRouter />} 
          />
          
          {/* Story viewing route */}
          <Route 
            path="/stories/:userId" 
            element={<StoryDisplayPage />} 
          />
          
          {/* Info page route */}
          <Route 
            path="/info" 
            element={
              <div className="app-container">
                <div className="app-header">
                  <h1 className="app-title">Love Retold</h1>
                  <p>Recording & Story Interface</p>
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
                    <h3>View Stories</h3>
                    <p>Enter a user ID to view recorded stories (for testing purposes).</p>
                    <div className="user-id-form">
                      <input 
                        type="text" 
                        placeholder="Enter User ID" 
                        id="userIdInput"
                        className="form-input"
                      />
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          const userId = document.getElementById('userIdInput').value.trim();
                          if (userId) {
                            window.location.href = `/stories/${userId}`;
                          } else {
                            alert('Please enter a User ID');
                          }
                        }}
                      >
                        View Stories
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            } 
          />
          
          {/* 404 route */}
          <Route 
            path="*" 
            element={
              <div className="app-container">
                <StatusMessage
                  status="error"
                  title="Page Not Found"
                  message="The page you're looking for doesn't exist. Please check your recording link and try again."
                  actionButton={
                    <button 
                      onClick={() => window.history.back()}
                      className="btn btn-secondary"
                    >
                      Go Back
                    </button>
                  }
                />
              </div>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;