/**
 * ReviewRecordingScreen.jsx
 * --------------------------
 * Shows recorded media in a player for review before upload.
 * Displays loading state while recording is being prepared.
 * Includes Start Over and Upload action buttons.
 *
 * Returns standard screen format:
 * - timer: null
 * - content: Media player with review title
 * - actions: Start Over and Upload buttons
 */

import React from 'react';
import { FaUndo, FaCloudUploadAlt } from 'react-icons/fa';
import PlyrMediaPlayer from '../PlyrMediaPlayer';

function ReviewRecordingScreen({
  recordedBlobUrl,
  captureMode,
  actualMimeType,
  isPlayerReady,
  onPlayerReady,
  onStartOver,
  onUpload,
  onBack
}) {
  const content = !recordedBlobUrl ? (
    <div className="review-content">
      <div className="review-title">Review your recording</div>
      <div className="loading-message">Preparing your recording...</div>
    </div>
  ) : (
    <div className="review-content">
      <div className="review-title">Review your recording</div>
      <PlyrMediaPlayer
        src={recordedBlobUrl}
        type={captureMode}
        actualMimeType={actualMimeType}
        onReady={onPlayerReady}
        className="inline-media-player"
      />
    </div>
  );

  return {
    timer: null,
    content,
    actions: (
      <div className="two-button-row">
        <button
          type="button"
          className="two-button-left"
          onClick={onStartOver}
        >
          <FaUndo style={{ marginRight: '8px' }} />
          Start Over
        </button>
        <button
          type="button"
          className="two-button-right"
          onClick={onUpload}
        >
          <FaCloudUploadAlt style={{ marginRight: '8px' }} />
          Upload
        </button>
      </div>
    ),
    onBack
  };
}

export default ReviewRecordingScreen;
