/**
 * PausedRecordingScreen.jsx
 * -------------------------
 * Shows "Resume" and "Done" buttons when recording is paused.
 * User can continue recording or finish and review.
 *
 * Returns standard screen format:
 * - timer: null (RecordingBar managed separately in AppContent)
 * - content: PromptCard with session data
 * - actions: Resume and Done buttons
 */

import React from 'react';
import { FaPlay, FaStop } from 'react-icons/fa';
import PromptCard from '../PromptCard';
import PausedOverlay from '../PausedOverlay';
import { Button, ButtonRow } from '../ui';
import { useTokens } from '../../theme/TokenProvider';

function PausedRecordingScreen({ onResume, onDone, sessionData, onBack, countdownActive }) {
  const { tokens } = useTokens();

  return {
    timer: null,
    className: 'paused-recording-state',
    content: (
      <div style={{ paddingTop: tokens.spacing[12] }}>
        <PromptCard
          sessionData={sessionData}
          customBackgroundColor={tokens.colors.primary.DEFAULT}
          customQuestionColor="#FFFFFF"
        />
      </div>
    ),
    overlay: !countdownActive ? <PausedOverlay /> : null,
    actions: (
      <ButtonRow>
        <Button
          onClick={onResume}
          style={{
            width: '48%',
            backgroundColor: 'transparent',
            border: `1px solid ${tokens.colors.neutral.gray['01']}`,
            color: tokens.colors.primary.foreground
          }}
          fullWidth={false}
        >
          <FaPlay style={{ marginRight: tokens.spacing[2] }} />
          Resume
        </Button>
        <Button
          onClick={onDone}
          style={{
            width: '48%',
            backgroundColor: 'transparent',
            border: `1px solid ${tokens.colors.neutral.gray['01']}`,
            color: tokens.colors.primary.foreground
          }}
          fullWidth={false}
        >
          <FaStop style={{ marginRight: tokens.spacing[2], color: tokens.colors.status.recording_red }} />
          Done
        </Button>
      </ButtonRow>
    ),
    onBack
  };
}

export default PausedRecordingScreen;
