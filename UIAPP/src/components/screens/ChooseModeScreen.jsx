/**
 * ChooseModeScreen.jsx
 * --------------------
 * Screen for selecting audio or video recording mode.
 * User chooses between audio-only or video recording.
 * Displayed after user reads the prompt on PromptReadScreen.
 *
 * Returns standard screen format with all 3 sections:
 * - timer: "Choose your recording mode" text
 * - content: Large icons for audio and video
 * - actions: Audio and Video buttons
 */

import React from 'react';
import { FaMicrophoneAlt, FaVideo } from 'react-icons/fa';
import { Button, ButtonRow } from '../ui';
import { useTokens } from '../../theme/TokenProvider';

function ChooseModeScreen({ onAudioClick, onVideoClick, onBack }) {
  const { tokens } = useTokens();

  return {
    bannerContent: 'Choose recording mode',
    content: (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: tokens.spacing[12]
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.spacing[12]
          }}>
            <FaMicrophoneAlt size={85} color="rgba(44, 47, 72, 0.85)" />
            <FaVideo size={85} color="rgba(44, 47, 72, 0.85)" />
          </div>
          <p style={{
            fontSize: tokens.fontSize.base,
            fontWeight: tokens.fontWeight.normal,
            color: tokens.colors.primary.DEFAULT,
            margin: 0,
            textAlign: 'center'
          }}>
            You can record your memory as a video or as audio-only
          </p>
        </div>
      </div>
    ),
    actions: (
      <ButtonRow>
        <Button
          variant="secondary"
          onClick={onAudioClick}
          style={{
            width: '48%',
            backgroundColor: tokens.colors.button.leftHandButton,
            border: `0.5px solid ${tokens.colors.onboarding.fontColor}`,
            color: tokens.colors.primary.DEFAULT
          }}
          fullWidth={false}
        >
          <FaMicrophoneAlt style={{ marginRight: tokens.spacing[2] }} />
          Audio
        </Button>
        <Button
          onClick={onVideoClick}
          style={{ width: '48%' }}
          fullWidth={false}
        >
          <FaVideo style={{ marginRight: tokens.spacing[2] }} />
          Video
        </Button>
      </ButtonRow>
    ),
    onBack
  };
}

export default ChooseModeScreen;
