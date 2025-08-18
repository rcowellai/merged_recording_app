/**
 * VideoPreview.jsx
 * ----------------
 * A small, embedded video element for showing a live
 * camera stream while recording video. Fits within
 * the UI to preview what the camera is capturing.
 */


import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/*
  VideoPreview
  ------------
  - Bottom and left alignment matches the mic box.
  - Height matches the button (80px).
  - No border or background, but retains rounded corners (8px).
  - Video fills the container with object-fit: cover.
*/

function VideoPreview({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Container matches the mic box area: 80px tall, 100% width of .single-plus-left.
  const containerStyle = {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  // The video has rounded corners (8px) and fills the container.
  const videoStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '8px',
    objectFit: 'cover'
  };

  return (
    <div style={containerStyle}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={videoStyle}
      />
    </div>
  );
}

VideoPreview.propTypes = {
  stream: PropTypes.object // MediaStream object or null
};

export default VideoPreview;
