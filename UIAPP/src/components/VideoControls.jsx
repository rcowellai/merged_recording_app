/**
 * VideoControls.jsx
 * ------------------
 * Minimalist external video player controls for PlyrMediaPlayer.
 * Clean, single-row layout with icon-only play/pause, progress bar, and time.
 *
 * Design Philosophy:
 * - No background containers or padding boxes
 * - Icon-only buttons (no Button component backgrounds)
 * - Thin, minimal progress bar
 * - Small, muted time display
 * - Single horizontal row layout
 *
 * Phase 1.5: Minimalist Design
 * - Play/Pause icon (switches on state)
 * - Progress bar for seeking
 * - Time display (current / duration)
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaPlay, FaPause } from 'react-icons/fa';
import { useTokens } from '../theme/TokenProvider';

export function VideoControls({ player }) {
  const { tokens } = useTokens();

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Sync state with Plyr events
  useEffect(() => {
    if (!player) return;

    // Event handlers
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(player.currentTime || 0);
    const handleLoadedMetadata = () => {
      setDuration(player.duration || 0);
      setCurrentTime(player.currentTime || 0);
    };

    // Register event listeners
    player.on('play', handlePlay);
    player.on('pause', handlePause);
    player.on('timeupdate', handleTimeUpdate);
    player.on('loadedmetadata', handleLoadedMetadata);

    // Initialize state if already loaded
    if (player.duration) {
      setDuration(player.duration);
      setCurrentTime(player.currentTime || 0);
      setIsPlaying(player.playing);
    }

    // Cleanup function
    return () => {
      player.off('play', handlePlay);
      player.off('pause', handlePause);
      player.off('timeupdate', handleTimeUpdate);
      player.off('loadedmetadata', handleLoadedMetadata);
    };
  }, [player]);

  /**
   * Format seconds to M:SS or H:MM:SS format
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '0:00';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');

    // Only show hours if video is >= 1 hour
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
  };

  /**
   * Handle play/pause icon click
   */
  const handlePlayPause = () => {
    if (!player) return;

    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  /**
   * Handle keyboard interaction for play/pause
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePlayPause();
    }
  };

  /**
   * Handle progress bar seek
   * @param {Event} e - Change event from range input
   */
  const handleSeek = (e) => {
    if (!player) return;
    player.currentTime = parseFloat(e.target.value);
  };

  // Don't render if no player instance
  if (!player) {
    return null;
  }

  return (
    <div
      className="custom-video-controls"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing[3],
        marginTop: tokens.spacing[4],
        width: '100%',
        maxWidth: '500px',
        border: '2px solid cyan'
      }}
      role="region"
      aria-label="Video controls"
    >
      {/* Play/Pause Icon Button */}
      <div
        onClick={handlePlayPause}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={isPlaying ? 'Pause video' : 'Play video'}
        aria-pressed={isPlaying}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: tokens.spacing[1],
          color: tokens.colors.primary.DEFAULT,
          transition: 'opacity 0.2s ease',
          flexShrink: 0,
          border: '2px solid magenta'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        {isPlaying ? (
          <FaPause size={20} aria-hidden="true" />
        ) : (
          <FaPlay size={20} aria-hidden="true" />
        )}
      </div>

      {/* Minimal Progress Bar */}
      <input
        type="range"
        min="0"
        max={duration || 0}
        value={currentTime}
        onChange={handleSeek}
        step="0.1"
        style={{
          flex: 1,
          height: '4px',
          cursor: 'pointer',
          background: 'transparent'
        }}
        aria-label="Seek video position"
        aria-valuemin="0"
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
      />

      {/* Time Display */}
      <span
        style={{
          fontSize: tokens.fontSize.sm,
          color: tokens.colors.primary.DEFAULT,
          fontFamily: tokens.fonts.primary,
          fontWeight: tokens.fontWeight.semibold,
          whiteSpace: 'nowrap',
          minWidth: '80px',
          textAlign: 'right',
          flexShrink: 0,
          border: '2px solid lime'
        }}
        aria-live="off"
        aria-atomic="true"
      >
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {/* Enhanced range input styling */}
      <style>{`
        /* Webkit browsers (Chrome, Safari, Edge) */
        .custom-video-controls input[type="range"]::-webkit-slider-track {
          height: 4px;
          background: ${tokens.colors.neutral.gray['01']};
          border-radius: 2px;
          border: none;
        }

        .custom-video-controls input[type="range"]::-webkit-slider-runnable-track {
          height: 4px;
          background: ${tokens.colors.neutral.gray['01']};
          border-radius: 2px;
          border: none;
        }

        .custom-video-controls input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: ${tokens.colors.primary.DEFAULT} !important;
          border: none !important;
          border-radius: 50%;
          cursor: pointer;
          margin-top: -5px;  /* Center on track */
          transition: transform 0.1s ease;
          box-shadow: none !important;
        }

        .custom-video-controls input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .custom-video-controls input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(1.1);
        }

        /* Firefox */
        .custom-video-controls input[type="range"]::-moz-range-track {
          height: 4px;
          background: ${tokens.colors.neutral.gray['01']};
          border-radius: 2px;
          border: none;
        }

        .custom-video-controls input[type="range"]::-moz-range-progress {
          height: 4px;
          background: ${tokens.colors.neutral.gray['01']};
          border-radius: 2px;
          border: none;
        }

        .custom-video-controls input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: ${tokens.colors.primary.DEFAULT} !important;
          border: none !important;
          border-radius: 50%;
          cursor: pointer;
          margin-top: -5px;  /* Center on track */
          transition: transform 0.1s ease;
          box-shadow: none !important;
        }

        .custom-video-controls input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
        }

        .custom-video-controls input[type="range"]::-moz-range-thumb:active {
          transform: scale(1.1);
        }

        /* Remove default focus outline, use custom */
        .custom-video-controls input[type="range"]:focus {
          outline: none;
        }

        .custom-video-controls input[type="range"]:focus-visible {
          outline: 2px solid rgba(44, 47, 72, 0.85);
          outline-offset: 2px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

VideoControls.propTypes = {
  player: PropTypes.object
};

export default VideoControls;
