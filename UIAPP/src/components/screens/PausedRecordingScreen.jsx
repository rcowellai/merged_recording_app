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
import { useBreakpoint } from '../../hooks/useBreakpoint';

/**
 * PausedRecordingScreenContent - Inner component that safely uses hooks
 */
function PausedRecordingScreenContent({ sessionData }) {
  const { tokens } = useTokens();
  const { isMobile } = useBreakpoint();

  return (
    <div style={{
      paddingTop: isMobile ? tokens.spacing[12] : 0,
      display: isMobile ? 'block' : 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      justifyContent: isMobile ? 'flex-start' : 'center',
      flex: isMobile ? 'none' : 1
    }}>
      <PromptCard
        sessionData={sessionData}
        customBackgroundColor={tokens.colors.primary.DEFAULT}
        customQuestionColor="#FFFFFF"
      />
    </div>
  );
}

function PausedRecordingScreen({ onResume, onDone, sessionData, onBack, countdownActive }) {
  const { tokens } = useTokens();

  return {
    timer: null,
    className: 'paused-recording-state',
    content: <PausedRecordingScreenContent sessionData={sessionData} />,
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
