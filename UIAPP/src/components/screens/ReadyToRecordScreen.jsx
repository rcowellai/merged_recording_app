/**
 * ReadyToRecordScreen.jsx
 * -----------------------
 * Displays prompt card with single "RECORD" button to begin recording.
 * Simplified interface without preview - user clicks green button to start.
 *
 * Returns standard screen format:
 * - timer: null
 * - content: PromptCard with session data
 * - actions: Single full-width green "RECORD" button
 */

import React from 'react';
import { FaChevronDown } from 'react-icons/fa';
import PromptCard from '../PromptCard';
import { Button } from '../ui';
import { useTokens } from '../../theme/TokenProvider';

// Record icon from RecordingBar - open ring with filled dot in center
function RecordIcon({ size = 16, color }) {
  const half = size / 2;
  const outerRadius = size / 2 - 1;
  const innerRadius = size / 4;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ marginRight: '12px', flexShrink: 0 }}
    >
      {/* Outer ring */}
      <circle
        cx={half}
        cy={half}
        r={outerRadius}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      {/* Inner dot */}
      <circle
        cx={half}
        cy={half}
        r={innerRadius}
        fill={color}
      />
    </svg>
  );
}

function ReadyToRecordScreen({ captureMode, mediaStream, onStartRecording, sessionData, onBack }) {
  const { tokens } = useTokens();

  return {
    bannerContent: "You're ready to record",
    content: (
      <div style={{ paddingTop: tokens.spacing[12] }}>
        <PromptCard sessionData={sessionData} />
        {/* Bouncing arrow indicator - positioned flush at bottom of SECTION B */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'bounce 1.5s ease-in-out infinite'
        }}>
          <FaChevronDown
            size={24}
            color={tokens.colors.status.success}
            style={{ margin: 0, padding: 0 }}
          />
        </div>
      </div>
    ),
    actions: (
      <Button variant="success" onClick={onStartRecording}>
        <RecordIcon size={16} color="#FFFFFF" />
        Record
      </Button>
    ),
    onBack
  };
}

export default ReadyToRecordScreen;
