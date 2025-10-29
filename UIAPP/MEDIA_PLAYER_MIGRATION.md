# Media Player Migration: Plyr → Video.js

**Status**: ✅ **COMPLETED**
**Priority**: High
**Completed**: 2025-01-28
**Original Estimate**: 2-3 hours
**Actual Effort**: ~2 hours

---

## Context

The LoveRetold Recorder app uses media players to review recorded audio/video before upload. Current implementation:

- **PlyrMediaPlayer.jsx**: Original component using Plyr.js (working but difficult to customize)
- **ReviewRecordingScreen.jsx**: Currently using ReactPlayer (not working with blob URLs)
- **Design System**: TokenProvider.jsx with comprehensive color tokens requiring integration

## Issue

### Critical Problems

1. **ReactPlayer Incompatibility**: Blob URLs from MediaRecorder fail to play
   - ReactPlayer's FilePlayer cannot detect MIME types from blob URLs
   - No file extension on `blob:http://localhost:3000/uuid` URLs
   - Results in complete playback failure

2. **Plyr Customization Difficulties**:
   - Requires `!important` overrides throughout CSS (plyr-overrides.css:23-38)
   - CSS custom properties don't work reliably due to high specificity
   - Manual targeting of nested Plyr classes creates maintenance burden
   - No integration with TokenProvider design system

### Requirements

- ✅ Play blob URLs from MediaRecorder API
- ✅ Handle MIME types (`video/mp4`, `video/webm`, `audio/mp3`, `audio/webm`)
- ✅ Support both audio and video modes
- ✅ Customizable colors matching design tokens
- ✅ Polished, professional appearance
- ✅ Event callbacks: `onReady`, `onPlay`, `onPause`, `onTimeUpdate`, `onEnded`, `onError`

---

## Solution: Migrate to Video.js

### Why Video.js

| Capability | Video.js | Plyr | ReactPlayer |
|------------|----------|------|-------------|
| **Blob URL Support** | ✅ Native | ✅ Works | ❌ Broken |
| **MIME Type Handling** | ✅ `player.src({ src, type })` | ✅ `<source type>` | ❌ Limited |
| **Color Customization** | ✅ CSS variables | ⚠️ `!important` wars | ❌ Browser defaults |
| **Token Integration** | ✅ Direct mapping | ❌ Manual overrides | ❌ Not possible |
| **Audio Mode** | ✅ `audioOnlyMode` option | ⚠️ Manual styling | ⚠️ Browser controls |
| **Bundle Size** | 244KB | 32KB | 45KB |

**Decision**: Video.js provides native blob URL support with easy theming via CSS variables, eliminating Plyr's customization difficulties.

---

## Proposed Approach

### Phase 1: Install Dependencies (5 min)

```bash
npm install video.js
npm install video-react  # React wrapper (optional)
npm uninstall react-player  # Remove broken dependency
```

### Phase 2: Create VideoJSPlayer Component (30 min)

**File**: `src/components/VideoJSPlayer.jsx`

```jsx
import React, { useRef, useEffect } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import '../styles/videojs-theme.css';

function VideoJSPlayer({
  src,
  type = 'video',
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
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Initialize Video.js
    const player = videojs(videoRef.current, {
      controls: true,
      fluid: true,
      preload: 'metadata',
      audioOnlyMode: type === 'audio',
      controlBar: {
        children: [
          'playToggle',
          'progressControl',
          'currentTimeDisplay',
          'durationDisplay',
          'volumePanel',
          'playbackRateMenuButton',
          'fullscreenToggle'
        ]
      }
    });

    playerRef.current = player;

    // Set source with MIME type
    player.src({
      src: src,
      type: actualMimeType || (type === 'video' ? 'video/mp4' : 'audio/mp3')
    });

    // Event listeners
    player.on('ready', () => onReady?.(player));
    player.on('play', () => onPlay?.(player));
    player.on('pause', () => onPause?.(player));
    player.on('timeupdate', () => onTimeUpdate?.(player));
    player.on('ended', () => onEnded?.(player));
    player.on('error', () => onError?.(player));

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [src, type, actualMimeType]);

  return (
    <div className={`videojs-player-wrapper ${className}`} style={style}>
      <video
        ref={videoRef}
        className="video-js vjs-loveretold-theme"
      />
    </div>
  );
}

export default VideoJSPlayer;
```

### Phase 3: Create Theme Stylesheet (30 min)

**File**: `src/styles/videojs-theme.css`

```css
/* Video.js theme using TokenProvider design tokens */
.video-js.vjs-loveretold-theme {
  /* Primary colors */
  --vjs-primary-color: #2C2F48;          /* tokens.colors.primary.DEFAULT */
  --vjs-primary-foreground: #FFFFFF;     /* tokens.colors.primary.foreground */

  /* Accent colors */
  --vjs-accent-color: #B72A32;           /* tokens.colors.status.recording_red */
  --vjs-interactive-color: #6366f1;      /* tokens.colors.accent.interactive */

  /* Control bar */
  --vjs-control-bar-background: rgba(44, 47, 72, 0.9);
  --vjs-control-bar-text-color: #FFFFFF;

  /* Progress bar */
  --vjs-play-progress-background: #B72A32;  /* Recording red */
  --vjs-load-progress-background: #BDBDBD;  /* Neutral gray */

  /* Hover states */
  --vjs-hover-color: #1c1e33;            /* tokens.colors.primary.darker */

  /* Spacing */
  --vjs-control-padding: 1rem;           /* tokens.spacing[4] */

  /* Border radius */
  border-radius: 0.5rem;                 /* tokens.borderRadius.lg */
}

/* Audio-specific styling */
.video-js.vjs-loveretold-theme.vjs-audio {
  background-color: transparent;
}

/* Control bar styling */
.vjs-loveretold-theme .vjs-control-bar {
  background: var(--vjs-control-bar-background);
  color: var(--vjs-control-bar-text-color);
  padding: var(--vjs-control-padding);
}

/* Play progress */
.vjs-loveretold-theme .vjs-play-progress {
  background-color: var(--vjs-play-progress-background);
}

/* Buttons */
.vjs-loveretold-theme .vjs-control:hover {
  background-color: var(--vjs-hover-color);
}
```

### Phase 4: Update ReviewRecordingScreen (30 min)

**File**: `src/components/screens/ReviewRecordingScreen.jsx`

```jsx
// Replace ReactPlayer import
import VideoJSPlayer from '../VideoJSPlayer';

// Replace ReactPlayer usage (lines 77-96)
{captureMode === 'audio' ? (
  <div style={{
    width: '100%',
    maxWidth: tokens.layout.maxWidth.md,
    minHeight: '55vh',
    border: `0.5px solid rgba(113, 128, 150, 0.5)`,
    borderRadius: tokens.borderRadius.lg,
    boxSizing: 'border-box',
    padding: tokens.spacing[4],
    backgroundColor: tokens.colors.button.leftHandButton,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <VideoJSPlayer
      key={recordedBlobUrl}
      src={recordedBlobUrl}
      type={captureMode}
      actualMimeType={actualMimeType}
      onReady={onPlayerReady}
      style={{ width: '100%' }}
    />
  </div>
) : (
  <VideoJSPlayer
    key={recordedBlobUrl}
    src={recordedBlobUrl}
    type={captureMode}
    actualMimeType={actualMimeType}
    onReady={onPlayerReady}
    style={{ width: '100%' }}
  />
)}
```

### Phase 5: Cleanup (15 min)

1. Remove ReactPlayer: `npm uninstall react-player`
2. Test blob URL playback with both audio and video
3. Verify design token colors match expected appearance
4. Optional: Remove PlyrMediaPlayer.jsx if no longer needed
5. Optional: Delete plyr-overrides.css

---

## Migration Checklist

- [ ] Install video.js and video-react
- [ ] Create VideoJSPlayer.jsx component
- [ ] Create videojs-theme.css with token integration
- [ ] Update ReviewRecordingScreen.jsx
- [ ] Test audio blob URL playback
- [ ] Test video blob URL playback
- [ ] Verify MIME type handling (mp4, webm)
- [ ] Validate color theming matches design tokens
- [ ] Test all event callbacks (onReady, onPlay, etc.)
- [ ] Remove react-player dependency
- [ ] Optional: Remove Plyr dependencies
- [ ] Update documentation

---

## Technical Notes

### Blob URL + MIME Type Pattern

Video.js requires explicit MIME type for blob URLs:

```javascript
player.src({
  src: 'blob:http://localhost:3000/uuid',
  type: 'video/mp4'  // or 'video/webm', 'audio/mp3', etc.
});
```

This matches the existing pattern in `useRecordingFlow.js:211`:

```javascript
const blob = new Blob(recordedChunksRef.current, { type: mimeType });
const url = URL.createObjectURL(blob);
```

### MIME Types (from config/index.js:24-34)

- **Video**: `video/mp4;codecs=h264`, `video/webm;codecs=vp8,opus`
- **Audio**: `audio/mp4;codecs=aac`, `audio/webm;codecs=opus`

### Audio-Only Mode

Video.js provides native `audioOnlyMode` option that hides video-specific controls and displays a minimal audio interface.

---

## References

- [Video.js Documentation](https://videojs.org/)
- [Video.js Theming Guide](https://videojs.org/guides/skins/)
- [Video.js GitHub - Blob URL Support](https://github.com/videojs/video.js/issues/5926)
- [Video.js Audio-Only Mode](https://github.com/videojs/video.js/pull/7647)

---

## Questions?

Contact the development team or refer to:
- `src/components/PlyrMediaPlayer.jsx` - Original working implementation
- `src/hooks/useRecordingFlow.js` - MediaRecorder and blob creation
- `src/theme/TokenProvider.jsx` - Design token definitions
