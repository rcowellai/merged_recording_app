/**
 * PlyrMediaPlayer.jsx
 * --------------------
 * Simplified media player component using Plyr.js
 * Follows official Plyr.js patterns for clean, reliable implementation
 */

import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

function PlyrMediaPlayer({
  src,
  type = 'video',
  title = 'Recording Review',
  actualMimeType,
  onReady,
  onPlay,
  onPause,
  onTimeUpdate,
  onEnded,
  onError,
  className = '',
  style = {}
}) {
  const playerRef = useRef(null);
  const plyrInstanceRef = useRef(null);

  // Helper function to determine correct MIME type for blob URLs
  const getSourceType = (src, type, actualMimeType) => {
    if (src && src.startsWith('blob:')) {
      // For blob URLs, use the actual MIME type from MediaRecorder
      if (actualMimeType) {
        return actualMimeType;
      }
      // Fallback to sensible defaults for blob URLs
      return type === 'video' ? 'video/mp4' : 'audio/mp3';
    }
    // For regular file URLs, use file extension
    const extension = src.split('.').pop().toLowerCase();
    return `${type}/${extension}`;
  };

  useEffect(() => {
    if (!playerRef.current || !src) return;

    // Clean up existing instance
    if (plyrInstanceRef.current) {
      plyrInstanceRef.current.destroy();
      plyrInstanceRef.current = null;
    }

    // Initialize Plyr on the media element
    const player = new Plyr(playerRef.current, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
      settings: ['speed'],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      keyboard: { focused: true, global: false },
      tooltips: { controls: true, seek: true },
      hideControls: false,
      resetOnEnd: false
    });

    plyrInstanceRef.current = player;

    // Event listeners
    player.on('ready', () => {
      onReady?.(player);
    });

    player.on('play', () => {
      onPlay?.(player);
    });

    player.on('pause', () => {
      onPause?.(player);
    });

    player.on('timeupdate', () => {
      onTimeUpdate?.(player);
    });

    player.on('ended', () => {
      onEnded?.(player);
    });

    player.on('error', (event) => {
      onError?.(event, player);
    });

    // Cleanup function
    return () => {
      if (plyrInstanceRef.current) {
        plyrInstanceRef.current.destroy();
        plyrInstanceRef.current = null;
      }
    };
  }, [src, type, actualMimeType, onReady, onPlay, onPause, onTimeUpdate, onEnded, onError]);

  return (
    <div className={`plyr-media-player ${className}`} style={{
      width: '100%',
      borderRadius: '8px',
      // Plyr theming via CSS custom properties
      '--plyr-color-main': 'transparent',
      '--plyr-video-control-color': '#ffffff',
      '--plyr-video-control-color-hover': '#ffffff',
      '--plyr-video-control-background-hover': 'transparent',
      '--plyr-audio-control-color': '#ffffff',
      '--plyr-audio-control-color-hover': '#ffffff',
      '--plyr-audio-control-background-hover': 'transparent',
      '--plyr-range-thumb-background': '#ffffff',
      '--plyr-range-track-background': 'rgba(255, 255, 255, 0.2)',
      '--plyr-range-fill-background': '#ffffff',
      '--plyr-range-thumb-active-shadow-width': '0',
      '--plyr-control-icon-size': '18px',
      '--plyr-control-spacing': '10px',
      ...style
    }}>
      {type === 'video' ? (
        <video
          ref={playerRef}
          controls
          playsInline
          preload="metadata"
          style={{ width: '100%', maxHeight: '400px' }}
        >
          <source src={src} type={getSourceType(src, type, actualMimeType)} />
          Your browser does not support the video element.
        </video>
      ) : (
        <audio
          ref={playerRef}
          controls
          preload="metadata"
          style={{ width: '100%' }}
        >
          <source src={src} type={getSourceType(src, type, actualMimeType)} />
          Your browser does not support the audio element.
        </audio>
      )}

      {/* Component-specific styles for enhanced focus removal */}
      <style>{`
        /* Hide overlay during playback with component-specific targeting */
        .plyr-media-player.plyr--playing .plyr__control--overlaid,
        .plyr-media-player .plyr.plyr--playing .plyr__control--overlaid {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }

        /* Component-specific focus removal (supplements global CSS) */
        .plyr-media-player .plyr__control--overlaid:focus,
        .plyr-media-player .plyr__control--overlaid:focus-visible,
        .plyr-media-player .plyr__control--overlaid:active {
          background: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}

PlyrMediaPlayer.propTypes = {
  src: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['video', 'audio']).isRequired,
  title: PropTypes.string,
  actualMimeType: PropTypes.string,
  onReady: PropTypes.func,
  onPlay: PropTypes.func,
  onPause: PropTypes.func,
  onTimeUpdate: PropTypes.func,
  onEnded: PropTypes.func,
  onError: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object
};

export default PlyrMediaPlayer;
