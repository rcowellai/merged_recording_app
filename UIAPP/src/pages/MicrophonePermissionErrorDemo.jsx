/**
 * MicrophonePermissionErrorDemo.jsx
 * ----------------------------------
 * Demo: Microphone Permission Denied Error
 * From: AudioTest.jsx:131-155
 */

import React from 'react';
import { FaMicrophoneAlt } from 'react-icons/fa';
import { useTokens } from '../theme/TokenProvider';
import { Button } from '../components/ui';
import MasterLayout from '../components/MasterLayout';

const MicrophonePermissionErrorDemo = () => {
  const { tokens } = useTokens();

  return (
    <MasterLayout
      content={(
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
            <FaMicrophoneAlt size={85} color={tokens.colors.status.error} />
            <p style={{
              fontSize: tokens.fontSize.base,
              fontWeight: tokens.fontWeight.normal,
              color: tokens.colors.primary.DEFAULT,
              margin: 0,
              textAlign: 'center'
            }}>
              Microphone access was denied.
              <br /><br />
              Please grant permission to continue.
            </p>
          </div>
        </div>
      )}
      actions={(
        <Button onClick={() => alert('Demo: Try Again clicked')}>
          Try Again
        </Button>
      )}
    />
  );
};

export default MicrophonePermissionErrorDemo;
