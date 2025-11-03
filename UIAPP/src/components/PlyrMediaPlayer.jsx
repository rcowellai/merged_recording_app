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
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTokens } from '../theme/TokenProvider';

function PlyrMediaPlayer({
  src,
  type = 'video',
  title = 'Recording Review',
  actualMimeType,
  hideControls = false,
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
  const { isMobile } = useBreakpoint();
  const { tokens } = useTokens();

  // Determine control color based on player type
  const controlColor = type === 'audio'
    ? tokens.colors.primary.DEFAULT      // #2C2F48 for audio
    : tokens.colors.primary.foreground;  // #FFFFFF for video

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
    if (!playerRef.current || !src) {
      return;
    }

    // Clean up existing instance
    if (plyrInstanceRef.current) {
      plyrInstanceRef.current.destroy();
      plyrInstanceRef.current = null;
    }

    // Initialize Plyr on the media element
    const config = {
      controls: hideControls ? [] : ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
      settings: [],  // Explicitly disable Plyr settings menu
      keyboard: { focused: true, global: false },
      tooltips: { controls: true, seek: true },
      resetOnEnd: false
    };

    const player = new Plyr(playerRef.current, config);
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
  }, [src, type, actualMimeType]); // Removed callbacks - they don't need to trigger re-initialization

  return (
    <div className={`plyr-media-player ${className}`} style={{
      width: '100%',
      overflow: 'visible',  // Ensure controls aren't clipped
      border: '2px solid purple',
      // Plyr theming via CSS custom properties - differentiated by player type
      '--plyr-color-main': controlColor,
      '--plyr-video-control-color': controlColor,
      '--plyr-video-control-color-hover': controlColor,
      '--plyr-video-control-background-hover': 'transparent',
      '--plyr-audio-control-color': controlColor,
      '--plyr-audio-control-color-hover': controlColor,
      '--plyr-audio-control-background-hover': 'transparent',
      '--plyr-range-thumb-background': controlColor,
      '--plyr-range-track-background': type === 'audio'
        ? 'rgba(44, 47, 72, 0.2)'   // Primary color with opacity for audio
        : 'rgba(255, 255, 255, 0.2)', // White with opacity for video
      '--plyr-range-fill-background': controlColor,
      '--plyr-range-thumb-active-shadow-width': '0',
      '--plyr-control-icon-size': '18px',
      '--plyr-control-spacing': '10px',
      '--plyr-control-z-index': '5100', // Plyr controls z-index (Layer 5)
      ...style
    }}>
      {type === 'video' ? (
        /* Square video container wrapper matching VideoTest.jsx */
        <div style={{
          maxWidth: '500px',
          maxHeight: '500px',
          aspectRatio: '1 / 1',
          overflow: 'hidden',
          borderRadius: '20px',
          margin: '0 auto',
          border: '2px solid pink'
        }}>
          <video
            ref={playerRef}
            playsInline
            preload="metadata"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          >
            <source src={src} type={getSourceType(src, type, actualMimeType)} />
            Your browser does not support the video element.
          </video>
        </div>
      ) : (
        <audio
          ref={playerRef}
          preload="metadata"
          style={{ width: '100%' }}
        >
          <source src={src} type={getSourceType(src, type, actualMimeType)} />
          Your browser does not support the audio element.
        </audio>
      )}

      {/* Component-specific styles for enhanced focus removal */}
      <style>{`
        /* Apply rounded corners to Plyr wrapper elements */
        .plyr-media-player .plyr,
        .plyr-media-player .plyr__video-wrapper {
          border-radius: 20px;
          overflow: hidden;
        }

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

        /* FORCE HIDE SETTINGS MENU - Override Plyr CSS */
        .plyr-media-player .plyr__menu,
        .plyr-media-player [data-plyr="settings"] {
          display: none !important;
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
  hideControls: PropTypes.bool,
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
