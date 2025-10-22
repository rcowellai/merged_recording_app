/**
 * ActiveRecordingScreen.jsx
 * -------------------------
 * Shows media preview while recording is in progress with "Pause" button.
 * User can see their live feed and pause the recording.
 */

import React from 'react';
import { FaPause } from 'react-icons/fa';
import VideoPreview from '../VideoPreview';
import AudioRecorder from '../AudioRecorder';

function ActiveRecordingScreen({ captureMode, mediaStream, onPause }) {
  const previewElement =
    captureMode === 'audio'
      ? <AudioRecorder stream={mediaStream} isRecording={true} />
      : <VideoPreview stream={mediaStream} />;

  return (
    <div className="single-plus-video-row">
      <div className="single-plus-left">
        {mediaStream ? previewElement : <div className="video-placeholder" />}
      </div>
      <button
        type="button"
        className="single-plus-right"
        onClick={onPause}
      >
        <FaPause style={{ marginRight: '8px' }} />
        Pause
      </button>
    </div>
  );
}

export default ActiveRecordingScreen;
