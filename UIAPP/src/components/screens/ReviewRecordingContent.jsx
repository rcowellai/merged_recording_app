/**
 * ReviewRecordingContent.jsx
 * ---------------------------
 * Shows recorded media in a player for review before upload.
 * Displays loading state while recording is being prepared.
 * Note: Action buttons (Start Over/Upload) are rendered in AppContent.jsx actions-section.
 */

import React from 'react';
import PlyrMediaPlayer from '../PlyrMediaPlayer';

function ReviewRecordingContent({
  recordedBlobUrl,
  captureMode,
  actualMimeType,
  isPlayerReady,
  onPlayerReady
}) {
  if (!recordedBlobUrl) {
    return (
      <div className="review-content">
        <div className="review-title">Review your recording</div>
        <div className="loading-message">Preparing your recording...</div>
      </div>
    );
  }

  return (
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
}

export default ReviewRecordingContent;
