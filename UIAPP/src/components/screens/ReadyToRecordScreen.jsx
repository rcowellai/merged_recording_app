/**
 * ReadyToRecordScreen.jsx
 * -----------------------
 * Shows media preview (video or audio) with "Start Recording" button.
 * User can see their camera/microphone feed before starting.
 */

import React from 'react';
import { FaCircle } from 'react-icons/fa';
import VideoPreview from '../VideoPreview';
import AudioRecorder from '../AudioRecorder';

function ReadyToRecordScreen({ captureMode, mediaStream, onStartRecording }) {
  const previewElement =
    captureMode === 'audio'
      ? <AudioRecorder stream={mediaStream} isRecording={false} />
      : <VideoPreview stream={mediaStream} />;

  return (
    <div className="single-plus-video-row">
      <div className="single-plus-left">
        {mediaStream ? previewElement : <div className="video-placeholder" />}
      </div>
      <button
        type="button"
        className="single-plus-right"
        onClick={onStartRecording}
      >
        <FaCircle style={{ marginRight: '8px' }} />
        Start recording
      </button>
    </div>
  );
}

export default ReadyToRecordScreen;
