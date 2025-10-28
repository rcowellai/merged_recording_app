/**
 * ActiveRecordingScreen.jsx
 * -------------------------
 * Shows media preview while recording is in progress with "Pause" button.
 * User can see their live feed and pause the recording.
 *
 * Returns standard screen format:
 * - timer: null (RecordingBar managed separately in AppContent)
 * - content: PromptCard with session data
 * - actions: Preview + Pause button layout
 */

import React from 'react';
import { FaPause } from 'react-icons/fa';
import VideoPreview from '../VideoPreview';
import AudioRecorder from '../AudioRecorder';
import AudioVisualizer from '../AudioVisualizer';
import PromptCard from '../PromptCard';
import { Button } from '../ui';
import { useTokens } from '../../theme/TokenProvider';

function ActiveRecordingScreen({ captureMode, mediaStream, onPause, sessionData, onBack }) {
  const { tokens } = useTokens();

  // DIAGNOSTIC: Log ActiveRecordingScreen render
  console.log('[ActiveRecordingScreen] 🟩 Component rendered', {
    captureMode,
    hasMediaStream: !!mediaStream,
    mediaStreamId: mediaStream?.id,
    audioTracks: mediaStream?.getAudioTracks().length,
    videoTracks: mediaStream?.getVideoTracks().length
  });

  const previewElement =
    captureMode === 'audio'
      ? <AudioRecorder stream={mediaStream} isRecording={true} />
      : <VideoPreview stream={mediaStream} />;

  return {
    timer: null,
    className: 'active-recording-state',
    content: (
      <div style={{ paddingTop: tokens.spacing[12] }}>
        <PromptCard
          sessionData={sessionData}
          customBackgroundColor={tokens.colors.primary.DEFAULT}
          customQuestionColor="#FFFFFF"
        />
      </div>
    ),
    actions: captureMode === 'audio' ? (
      // Audio mode: Single centered Pause button
      <Button
        onClick={onPause}
        fullWidth={true}
        style={{
          backgroundColor: 'transparent',
          border: `1px solid ${tokens.colors.neutral.gray['01']}`,
          color: tokens.colors.primary.foreground
        }}
      >
        <FaPause style={{ marginRight: tokens.spacing[2] }} />
        Pause
      </Button>
    ) : (
      // Video mode: Preview + Pause button side by side
      <div style={{
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
      }}>
        <div style={{
          width: '30%',
          height: '120px',
          backgroundColor: tokens.colors.neutral.default,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {mediaStream ? previewElement : <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: tokens.colors.neutral.default,
            borderRadius: tokens.borderRadius.lg
          }} />}
        </div>
        <Button
          onClick={onPause}
          style={{
            width: '65%',
            backgroundColor: 'transparent',
            border: `1px solid ${tokens.colors.neutral.gray['01']}`,
            color: tokens.colors.primary.foreground
          }}
          fullWidth={false}
        >
          <FaPause style={{ marginRight: tokens.spacing[2] }} />
          Pause
        </Button>
      </div>
    ),
    onBack
  };
}

export default ActiveRecordingScreen;
