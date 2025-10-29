/**
 * CameraPermissionErrorDemo.jsx
 * ------------------------------
 * Demo: Camera Permission Denied Error
 * From: VideoTest.jsx:122-146
 */

import React from 'react';
import { FaVideo } from 'react-icons/fa';
import { useTokens } from '../theme/TokenProvider';
import { Button } from '../components/ui';
import MasterLayout from '../components/MasterLayout';

const CameraPermissionErrorDemo = () => {
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
            <FaVideo size={85} color={tokens.colors.status.error} />
            <p style={{
              fontSize: tokens.fontSize.base,
              fontWeight: tokens.fontWeight.normal,
              color: tokens.colors.primary.DEFAULT,
              margin: 0,
              textAlign: 'center'
            }}>
              Camera access was denied.
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

export default CameraPermissionErrorDemo;
