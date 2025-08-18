import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  getEnhancedUserMedia, 
  ChunkedRecorder,
  uploadChunkedRecording,
  getRecordingSupport,
  createBlobFromChunks
} from '../services/unifiedRecording.js';
import { uploadChunkInBackground } from '../services/chunkUploadManager.js';
import { validateChunkCollection, generateDiagnosticReport } from '../utils/chunkCollectionValidator.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import StatusMessage from './StatusMessage.jsx';
import { runCodecCompatibilityTest } from '../utils/codecTest.js';

const EnhancedRecordingInterface = ({ sessionData, sessionId, sessionComponents }) => {
  // Recording states
  const [recordingMode, setRecordingMode] = useState(null); // null, 'audio', 'video'
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

  // Enhanced chunk collection for complete preview creation (using refs to avoid closure issues)
  const allRecordingChunksRef = useRef([]);
  const [chunkCollectionStats, setChunkCollectionStats] = useState({
    totalChunks: 0,
    totalSize: 0,
    estimatedMemoryMB: 0,
    lastChunkTime: null
  });

  // System states
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [browserSupport, setBrowserSupport] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Refs
  const chunkedRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const videoPreviewRef = useRef(null);  // For setup preview
  const videoRecordingRef = useRef(null);  // For recording preview

  // Check browser support on mount
  useEffect(() => {
    const support = getRecordingSupport();
    setBrowserSupport(support);
    
    if (!support.supported) {
      setError(support.message);
    }
    
    // Run codec compatibility test for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Running Epic 2.1 Codec Compatibility Test...');
      runCodecCompatibilityTest();
    }
  }, []);

  // Setup video preview - separate effects for better control
  useEffect(() => {
    // Setup preview for the setup screen only
    if (streamRef.current && recordingMode === 'video' && !isRecording && videoPreviewRef.current) {
      console.log('Setting up preview video');
      videoPreviewRef.current.srcObject = streamRef.current;
      
      const playPreview = async () => {
        try {
          await videoPreviewRef.current.play();
          console.log('Setup video preview playing successfully');
        } catch (playError) {
          console.warn('Setup video autoplay blocked:', playError.message);
        }
      };
      playPreview();
    }
  }, [recordingMode, permissionGranted, isRecording]);

  // Setup recording video preview - separate effect
  useEffect(() => {
    if (recordingMode === 'video') {
      if (isRecording && streamRef.current && videoRecordingRef.current) {
        console.log('Setting up recording video');
        
        // Clear any previous video element first
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
        
        // Set up recording video
        videoRecordingRef.current.srcObject = streamRef.current;
        
        const playRecording = async () => {
          try {
            await videoRecordingRef.current.play();
            console.log('Recording video preview playing successfully');
          } catch (playError) {
            console.warn('Recording video autoplay blocked:', playError.message);
          }
        };
        playRecording();
        
      } else if (!isRecording && videoRecordingRef.current) {
        // Clear recording video when not recording
        console.log('Clearing recording video');
        videoRecordingRef.current.srcObject = null;
      }
    }
  }, [recordingMode, isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chunkedRecorderRef.current) {
        chunkedRecorderRef.current.cleanup();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      // Clean up collected chunks to prevent memory leaks
      allRecordingChunksRef.current = [];
      console.log('🧹 Component unmount - all resources cleaned up');
    };
  }, [previewUrl]);

  // Format duration helper
  const formatDuration = useCallback((ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle mode selection (just-in-time permissions)
  const handleModeSelection = async (mode) => {
    try {
      setError(null);
      setWarning(null);
      setRecordingMode(mode);

      // Just-in-time permission request
      const stream = await getEnhancedUserMedia({
        audio: true, // Always include audio
        video: mode === 'video'
      });

      streamRef.current = stream;
      setPermissionGranted(true);

      // Setup video preview if video mode
      if (mode === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        
        // Ensure video plays - common fix for preview issues
        try {
          await videoPreviewRef.current.play();
          console.log('Video preview started successfully');
        } catch (playError) {
          console.warn('Video preview autoplay failed (normal in some browsers):', playError.message);
          // This is often blocked by browser autoplay policies, but manual click will work
        }
      }

    } catch (error) {
      console.error('Error setting up recording mode:', error);
      setError(error.message);
      setRecordingMode(null);
    }
  };

  // Handle start recording
  const handleStartRecording = async () => {
    try {
      if (!streamRef.current) return;

      setError(null);
      setWarning(null);
      setRecordedChunks([]);
      
      // Reset chunk collection for new recording
      allRecordingChunksRef.current = [];
      setChunkCollectionStats({
        totalChunks: 0,
        totalSize: 0,
        estimatedMemoryMB: 0,
        lastChunkTime: null
      });
      
      console.log('🎬 Starting new recording - chunk collection reset');

      // Setup chunked recorder
      const recorder = new ChunkedRecorder(streamRef.current, {
        mediaType: recordingMode,
        maxDuration: 15 * 60 * 1000, // 15 minutes
        chunkDuration: 45 * 1000, // 45 second chunks
        onChunkReady: (chunk, index) => {
          console.log(`Chunk ${index} ready, size: ${chunk.size}`);
          
          try {
            // Validate chunk data before processing
            if (!chunk || chunk.size === 0) {
              console.warn(`⚠️ Invalid chunk ${index}: empty or null`);
              return;
            }
            
            // Store chunk for complete preview creation (fixes black screen issue)
            const chunkData = {
              data: chunk,
              index: index,
              size: chunk.size,
              timestamp: Date.now(),
              type: chunk.type
            };
            
            // Store in ref to avoid closure issues
            allRecordingChunksRef.current = [...allRecordingChunksRef.current, chunkData];
            console.log(`📦 Chunk ${index} stored. Total collected: ${allRecordingChunksRef.current.length}`);
            
            // Update collection statistics for performance monitoring
            setChunkCollectionStats(prev => {
              const newTotalSize = prev.totalSize + chunk.size;
              const newTotalChunks = prev.totalChunks + 1;
              const estimatedMemoryMB = Math.round((newTotalSize / (1024 * 1024)) * 100) / 100;
              
              // Memory pressure monitoring
              const memoryWarningThreshold = 200; // 200MB
              const memoryCriticalThreshold = 400; // 400MB
              
              if (estimatedMemoryMB > memoryCriticalThreshold) {
                console.error(`🚨 CRITICAL: Memory usage ${estimatedMemoryMB}MB exceeds safe limits!`);
                setError(`Memory usage too high (${estimatedMemoryMB}MB). Recording may be unstable.`);
              } else if (estimatedMemoryMB > memoryWarningThreshold) {
                console.warn(`⚠️ WARNING: Memory usage ${estimatedMemoryMB}MB approaching limits`);
                setWarning(`High memory usage detected (${estimatedMemoryMB}MB). Consider shorter recordings.`);
              }
              
              // Log performance metrics for debugging
              if (process.env.NODE_ENV === 'development') {
                console.log(`📊 Chunk Collection Stats: ${newTotalChunks} chunks, ${estimatedMemoryMB}MB estimated`);
              }
              
              return {
                totalChunks: newTotalChunks,
                totalSize: newTotalSize,
                estimatedMemoryMB: estimatedMemoryMB,
                lastChunkTime: Date.now()
              };
            });
            
            // TODO: Future progressive upload hook point
            // await uploadChunkInBackground(chunkData, sessionId);
            
          } catch (error) {
            console.error(`❌ Error processing chunk ${index}:`, error);
            setError(`Chunk processing failed: ${error.message}`);
          }
        },
        onProgress: (elapsed) => {
          setRecordingDuration(elapsed);
        },
        onComplete: (chunks) => {
          setRecordedChunks(chunks);
          setIsRecording(false);
          setIsPaused(false);
          
          const collectedChunks = allRecordingChunksRef.current;
          console.log(`🎬 Recording complete! ChunkedRecorder chunks: ${chunks.length}, Collected chunks: ${collectedChunks.length}`);
          
          // Validate chunk collection (development mode)
          if (process.env.NODE_ENV === 'development') {
            const validation = validateChunkCollection(collectedChunks, chunks);
            const diagnostics = generateDiagnosticReport(chunkCollectionStats, collectedChunks);
            
            console.log('📊 Chunk Collection Validation:', validation);
            console.log('🔍 Diagnostic Report:', diagnostics);
            
            if (!validation.isValid) {
              console.warn('⚠️ Chunk collection issues detected:', validation.issues);
            }
          }
          
          // Use collected chunks for complete preview (fixes black screen for longer recordings)
          try {
            if (collectedChunks.length > 0) {
              console.log(`📹 Creating preview from ${collectedChunks.length} collected chunks (total: ${chunkCollectionStats.estimatedMemoryMB}MB)`);
              
              // Sort chunks by index to ensure proper order
              const sortedChunks = [...collectedChunks].sort((a, b) => a.index - b.index);
              const blob = createBlobFromChunks(sortedChunks, recordingMode);
              const url = URL.createObjectURL(blob);
              setPreviewUrl(url);
              
              const blobSizeMB = Math.round(blob.size / (1024 * 1024) * 100) / 100;
              console.log(`✅ Preview blob created successfully: ${blobSizeMB}MB`);
              
              // Success message for longer recordings
              if (sortedChunks.length > 3) {
                console.log(`🎉 BLACK SCREEN FIX SUCCESS: ${sortedChunks.length} chunks assembled for ${Math.round(sortedChunks.length * 0.75)}+ minute recording`);
              }
              
            } else {
              console.warn('⚠️ No collected chunks available, falling back to ChunkedRecorder chunks');
              console.error('🚨 CLOSURE BUG DETECTED: Collected chunks is 0 - this indicates a React closure issue');
              // Fallback to original method if collection failed
              const blob = createBlobFromChunks(chunks, recordingMode);
              const url = URL.createObjectURL(blob);
              setPreviewUrl(url);
            }
          } catch (error) {
            console.error('❌ Error creating preview blob:', error);
            setError('Failed to create recording preview: ' + error.message);
          }
        },
        onError: (error) => {
          console.error('Recording error:', error);
          setError('Recording failed: ' + error.message);
          setIsRecording(false);
          setIsPaused(false);
        },
        onWarning: (message) => {
          setWarning(message);
        },
        onPauseStateChange: (paused) => {
          console.log(`Recording ${paused ? 'paused' : 'resumed'} ${paused ? '(background)' : ''}`);
          setIsPaused(paused);
        }
      });

      chunkedRecorderRef.current = recorder;
      await recorder.start();
      setIsRecording(true);

    } catch (error) {
      console.error('Error starting recording:', error);
      setError(error.message);
    }
  };

  // Handle pause/resume
  const handlePauseResume = () => {
    if (!chunkedRecorderRef.current) return;

    if (isPaused) {
      chunkedRecorderRef.current.resume();
      setIsPaused(false);
      setWarning(null);
    } else {
      chunkedRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  // Handle stop recording
  const handleStopRecording = () => {
    if (chunkedRecorderRef.current) {
      chunkedRecorderRef.current.stop();
    }
  };

  // Handle upload recording
  const handleUploadRecording = async () => {
    if (!recordedChunks.length) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      if (sessionComponents) {
        // Love Retold upload with proper storage paths
        console.log('🚀 Starting Love Retold upload...');
        await uploadChunkedRecording(sessionId, sessionComponents, recordedChunks, {
          mediaType: recordingMode,
          onProgress: (progress) => {
            setUploadProgress(progress);
          }
        });
      } else {
        // Legacy upload for backward compatibility
        console.log('⚠️ Using legacy upload (no sessionComponents provided)');
        const { uploadChunkedRecordingLegacy } = await import('../services/unifiedRecording.js');
        await uploadChunkedRecordingLegacy(sessionId, recordedChunks, {
          mediaType: recordingMode,
          onProgress: (progress) => {
            setUploadProgress(progress);
          }
        });
      }

      setIsCompleted(true);
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle start over
  const handleStartOver = () => {
    // Cleanup current recording
    if (chunkedRecorderRef.current) {
      chunkedRecorderRef.current.cleanup();
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Reset states
    setRecordedChunks([]);
    setRecordingDuration(0);
    setUploadProgress(0);
    setError(null);
    setWarning(null);
    setPreviewUrl(null);
    setPermissionGranted(false);
    setRecordingMode(null);
    
    // Clean up chunk collection
    allRecordingChunksRef.current = [];
    setChunkCollectionStats({
      totalChunks: 0,
      totalSize: 0,
      estimatedMemoryMB: 0,
      lastChunkTime: null
    });
    
    console.log('🧹 Start over - all chunks and memory cleaned up');

    // Stop current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Show completion message
  if (isCompleted) {
    return (
      <StatusMessage
        status="completed"
        title="Memory Saved!"
        message="Your recording has been successfully saved with enhanced quality and will be processed shortly. You can now close this window."
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
  if (browserSupport && !browserSupport.supported) {
    return (
      <StatusMessage
        status="error"
        title="Browser Not Supported"
        message={browserSupport.message}
      />
    );
  }

  return (
    <div className="enhanced-recording-interface">
      {/* Question Display */}
      <div className="question-section">
        <h1 className="app-title">Love Retold</h1>
        <div className="question-display">
          <h2 className="question-text" data-testid="question-text">{sessionData.question}</h2>
        </div>
        
        {/* Browser Support Info */}
        {browserSupport && browserSupport.mp4Support && (
          <div className="codec-info">
            <small>✅ Enhanced MP4 recording supported</small>
          </div>
        )}
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

      {/* Warning Display */}
      {warning && (
        <div className="warning-message">
          <p>⚠️ {warning}</p>
        </div>
      )}

      {/* Mode Selection */}
      {!recordingMode && !isRecording && !recordedChunks.length && (
        <div className="mode-selection">
          <h3>Choose Recording Type</h3>
          <p className="mode-instructions">
            Select whether you want to record audio only or include video.
            Permissions will be requested when you start recording.
          </p>
          
          <div className="mode-buttons">
            <button 
              onClick={() => handleModeSelection('audio')}
              className="btn btn-large btn-mode audio-mode"
              disabled={!!error}
            >
              <div className="mode-icon">🎤</div>
              <div className="mode-label">Audio Only</div>
              <div className="mode-description">Voice recording</div>
            </button>
            
            <button 
              onClick={() => handleModeSelection('video')}
              className="btn btn-large btn-mode video-mode"
              disabled={!!error}
            >
              <div className="mode-icon">📹</div>
              <div className="mode-label">Audio + Video</div>
              <div className="mode-description">Face + voice recording</div>
            </button>
          </div>
        </div>
      )}

      {/* Video Preview (when video mode is selected but not recording) */}
      {recordingMode === 'video' && permissionGranted && !isRecording && !recordedChunks.length && (
        <div className="video-preview-section">
          <video 
            ref={videoPreviewRef}
            autoPlay 
            muted 
            playsInline
            className="camera-preview"
          />
          <p className="preview-note">Camera preview - ready to record</p>
        </div>
      )}

      {/* Recording Controls */}
      {recordingMode && permissionGranted && (
        <div className="recording-section">
          {/* Ready to record */}
          {!isRecording && !recordedChunks.length && (
            <div className="recording-start">
              <p className="instructions">
                Ready to record your memory {recordingMode === 'video' ? 'with video' : 'audio only'}. 
                You can record up to 15 minutes.
              </p>
              <button 
                onClick={handleStartRecording}
                className="btn btn-primary btn-large"
                disabled={!!error}
                data-testid="record-button"
              >
                🔴 Start Recording
              </button>
            </div>
          )}

          {/* Active recording */}
          {isRecording && (
            <div className="recording-active">
              <div className="recording-status">
                <div className="recording-indicator">
                  <div className={`pulse-dot ${isPaused ? 'paused' : ''}`}></div>
                  <span>{isPaused ? 'Paused' : 'Recording...'}</span>
                </div>
                <div className="duration-display">
                  {formatDuration(recordingDuration)}
                  <span className="duration-limit"> / 15:00</span>
                </div>
              </div>

              {/* Video preview during recording */}
              {recordingMode === 'video' && (
                <video 
                  ref={videoRecordingRef}
                  autoPlay 
                  muted 
                  playsInline
                  className="recording-preview"
                  onLoadedMetadata={() => {
                    console.log('Video metadata loaded during recording');
                    // Stream assignment is now handled by useEffect, just ensure play
                    if (videoRecordingRef.current) {
                      videoRecordingRef.current.play().catch(err => 
                        console.warn('Recording video play failed:', err.message)
                      );
                    }
                  }}
                />
              )}

              <div className="recording-controls">
                <button 
                  onClick={handlePauseResume}
                  className={`btn btn-secondary ${isPaused ? 'resume' : 'pause'}`}
                >
                  {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                </button>
                
                <button 
                  onClick={handleStopRecording}
                  className="btn btn-danger"
                >
                  ⏹️ Stop Recording
                </button>
              </div>
            </div>
          )}

          {/* Recording preview */}
          {recordedChunks.length > 0 && !isUploading && (
            <div className="recording-preview">
              <h3>Recording Complete!</h3>
              
              {/* Media preview */}
              <div className="media-player">
                {recordingMode === 'video' ? (
                  <video 
                    controls 
                    src={previewUrl}
                    className="video-preview"
                  />
                ) : (
                  <audio 
                    controls 
                    src={previewUrl}
                    className="audio-preview"
                  />
                )}
              </div>
              
              <div className="recording-info">
                <p>Duration: {formatDuration(recordingDuration)}</p>
                <p>Type: {recordingMode === 'video' ? 'Audio + Video' : 'Audio Only'}</p>
                <p>Quality: Enhanced MP4 format</p>
              </div>
              
              <div className="preview-actions">
                <button 
                  onClick={handleStartOver}
                  className="btn btn-secondary"
                >
                  🔄 Start Over
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

          {/* Upload progress */}
          {isUploading && (
            <div className="upload-progress">
              <LoadingSpinner 
                message={`Uploading enhanced ${recordingMode} recording... ${uploadProgress}%`}
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
                Enhanced processing may take a moment.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Instructions */}
      <div className="instructions-section">
        <details className="instructions-details">
          <summary>Enhanced Recording Tips</summary>
          <ul>
            <li><strong>Audio Quality:</strong> Find a quiet place with good acoustics</li>
            <li><strong>Video Quality:</strong> Ensure good lighting and stable position</li>
            <li><strong>Duration:</strong> Up to 15 minutes maximum recording time</li>
            <li><strong>Pause/Resume:</strong> Use pause if you need a break</li>
            <li><strong>Background:</strong> Recording auto-pauses if you switch apps</li>
            <li><strong>Format:</strong> Enhanced MP4 format for maximum compatibility</li>
            <li><strong>Mobile:</strong> Portrait orientation locked for video recording</li>
          </ul>
        </details>
        
        {recordingMode && (
          <button 
            onClick={handleStartOver}
            className="btn btn-link btn-sm change-mode"
          >
            Change Recording Mode
          </button>
        )}
      </div>
    </div>
  );
};

export default EnhancedRecordingInterface;