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

function ChooseModeScreen({ onAudioClick, onVideoClick, onBack }) {
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
          gap: 'var(--spacing-12)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-12)'
          }}>
            <FaMicrophoneAlt size={85} color="rgba(44, 47, 72, 0.85)" />
            <FaVideo size={85} color="rgba(44, 47, 72, 0.85)" />
          </div>
          <p style={{
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-normal)',
            color: 'var(--color-onboarding-font)',
            margin: 0,
            textAlign: 'center'
          }}>
            You can record your memory as a video or as audio-only
          </p>
        </div>
      </div>
    ),
    actions: (
      <div className="two-button-row">
        <button
          type="button"
          className="two-button-left"
          onClick={onAudioClick}
        >
          <FaMicrophoneAlt style={{ marginRight: 'var(--spacing-2)' }} />
          Audio
        </button>
        <button
          type="button"
          className="two-button-right"
          onClick={onVideoClick}
        >
          <FaVideo style={{ marginRight: 'var(--spacing-2)' }} />
          Video
        </button>
      </div>
    ),
    onBack
  };
}

export default ChooseModeScreen;
