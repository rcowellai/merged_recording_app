import React, { useState, useRef, useEffect } from 'react';
import { 
  getUserMedia, 
  startRecording, 
  stopRecording, 
  uploadRecording, 
  getRecordingDuration,
  isRecordingSupported 
} from '../services/recording.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import StatusMessage from './StatusMessage.jsx';

const RecordingInterface = ({ sessionData, sessionId }) => {
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState(null);

  // Refs
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const durationIntervalRef = useRef(null);

  // Check browser support on mount
  useEffect(() => {
    if (!isRecordingSupported()) {
      setError('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Safari.');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      setError(null);
      
      // Get user media
      const stream = await getUserMedia({ audio: true });
      streamRef.current = stream;

      // Start recording
      const mediaRecorder = startRecording(
        stream,
        null, // onDataAvailable callback
        async (blob) => {
          setRecordedBlob(blob);
          setIsRecording(false);
          
          // Calculate duration
          const duration = await getRecordingDuration(blob);
          setRecordingDuration(duration);
          
          // Clear duration interval
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
          }
        }
      );

      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingDuration(Math.floor(elapsed));
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setError(error.message);
    }
  };

  const handleStopRecording = () => {
    try {
      stopRecording(mediaRecorderRef.current, streamRef.current);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setError('Failed to stop recording. Please try again.');
    }
  };

  const handleUploadRecording = async () => {
    if (!recordedBlob) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      await uploadRecording(
        sessionId, 
        recordedBlob, 
        (progress) => setUploadProgress(Math.round(progress))
      );

      setIsCompleted(true);
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartOver = () => {
    setRecordedBlob(null);
    setRecordingDuration(0);
    setUploadProgress(0);
    setError(null);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show completion message
  if (isCompleted) {
    return (
      <StatusMessage
        status="completed"
        title="Memory Saved!"
        message="Your recording has been successfully saved and will be processed shortly. You can now close this window."
        actionButton={
          <button 
            onClick={() => window.close()}
            className="btn btn-primary"
          >
            Close Window
          </button>
        }
      />
    );
  }

  // Show error if browser not supported
  if (error && !isRecordingSupported()) {
    return (
      <StatusMessage
        status="error"
        title="Browser Not Supported"
        message={error}
      />
    );
  }

  return (
    <div className="recording-interface">
      {/* Question Display */}
      <div className="question-section">
        <h1 className="app-title">Love Retold</h1>
        <div className="question-display">
          <h2 className="question-text">{sessionData.question}</h2>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button 
            onClick={() => setError(null)}
            className="btn btn-sm btn-secondary"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Recording Controls */}
      <div className="recording-section">
        {!recordedBlob && !isRecording && (
          <div className="recording-start">
            <p className="instructions">
              Click the button below to start recording your memory. 
              Speak clearly and take your time.
            </p>
            <button 
              onClick={handleStartRecording}
              className="btn btn-primary btn-large"
              disabled={!!error}
            >
              🎤 Start Recording
            </button>
          </div>
        )}

        {isRecording && (
          <div className="recording-active">
            <div className="recording-indicator">
              <div className="pulse-dot"></div>
              <span>Recording...</span>
            </div>
            <div className="duration-display">
              {formatDuration(recordingDuration)}
            </div>
            <button 
              onClick={handleStopRecording}
              className="btn btn-danger btn-large"
            >
              ⏹️ Stop Recording
            </button>
          </div>
        )}

        {recordedBlob && !isUploading && (
          <div className="recording-preview">
            <h3>Recording Complete!</h3>
            <div className="audio-player">
              <audio 
                controls 
                src={URL.createObjectURL(recordedBlob)}
                className="audio-preview"
              />
            </div>
            <div className="recording-info">
              <p>Duration: {formatDuration(recordingDuration)}</p>
            </div>
            <div className="preview-actions">
              <button 
                onClick={handleStartOver}
                className="btn btn-secondary"
              >
                🔄 Record Again
              </button>
              <button 
                onClick={handleUploadRecording}
                className="btn btn-primary"
              >
                💾 Save Memory
              </button>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="upload-progress">
            <LoadingSpinner 
              message={`Uploading... ${uploadProgress}%`}
              size="large"
            />
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="upload-note">
              Please don't close this window while uploading.
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="instructions-section">
        <details className="instructions-details">
          <summary>Recording Tips</summary>
          <ul>
            <li>Find a quiet place to record</li>
            <li>Speak clearly and at a normal pace</li>
            <li>You can pause and think - there's no time limit</li>
            <li>If you make a mistake, just start over</li>
            <li>Your recording will be automatically transcribed</li>
          </ul>
        </details>
      </div>
    </div>
  );
};

export default RecordingInterface;