/**
 * ActiveRecordingScreen.jsx
 * -------------------------
 * Shows media preview while recording is in progress with "Pause" button.
 * User can see their live feed and pause the recording.
 *
 * Returns standard screen format:
 * - timer: null (RecordingBar managed separately in AppContent)
 * - content: PromptCard with session data (Section B - green border)
 * - actions: Preview + button in single-plus-video-row layout (Section C - purple border)
 */

import React from 'react';
import { FaPause } from 'react-icons/fa';
import VideoPreview from '../VideoPreview';
import AudioRecorder from '../AudioRecorder';
import PromptCard from '../PromptCard';

function ActiveRecordingScreen({ captureMode, mediaStream, onPause, sessionData, onBack }) {
  const previewElement =
    captureMode === 'audio'
      ? <AudioRecorder stream={mediaStream} isRecording={true} />
      : <VideoPreview stream={mediaStream} />;

  return {
    timer: null,
    content: <PromptCard sessionData={sessionData} />,
    actions: (
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
    ),
    onBack
  };
}

export default ActiveRecordingScreen;
