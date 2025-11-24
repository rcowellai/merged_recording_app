/**
 * DebugService.js
 * ---------------
 * Real-time debugging tool for iOS media stream tracking
 *
 * PURPOSE:
 * Tracks active MediaStream objects and MediaRecorder state to diagnose
 * iOS privacy indicator issues (camera/mic lights staying on after recording stops)
 *
 * FEATURES:
 * - Real-time stream tracking with 500ms polling
 * - Visual status indicators (MIC/CAM counters with red/green states)
 * - Event logging with timestamps
 * - Mobile-optimized overlay UI with iOS safe area support
 */

import React, { useState, useEffect } from 'react';

class DebugService {
  constructor() {
    this.logs = [];
    this.listeners = new Set();
    this.startTime = Date.now();

    // Trackers
    this.trackedStreams = new Set(); // Stores actual MediaStream objects
    this.recorderState = 'idle';
  }

  // --- LOGGING ---
  log(category, message, data = null) {
    const delta = Date.now() - this.startTime;
    let dataStr = '';

    if (data) {
      if (data instanceof MediaStream) {
        dataStr = `Stream:${data.id} [${data.active ? 'Active' : 'Inactive'}]`;
      } else if (data instanceof MediaStreamTrack) {
        dataStr = `${data.kind}:${data.readyState}`;
      }
    }

    const entry = {
      id: Math.random(),
      time: delta,
      category,
      message,
      dataStr
    };

    this.logs.unshift(entry);
    if (this.logs.length > 50) this.logs.pop();
    this.notify();
  }

  // --- STREAM TRACKING ---
  trackStream(stream) {
    if (!stream) return;
    this.trackedStreams.add(stream);
    this.log('SYS', `Tracking new stream: ${stream.id}`);
    this.notify();
  }

  setRecorderState(state) {
    this.recorderState = state;
    this.notify();
  }

  // Calculate live stats by iterating all known streams
  // ENHANCED: Return detailed stream info with tags for leak detection
  getStats() {
    const activeStreams = [];
    const streamsToRemove = [];

    this.trackedStreams.forEach(stream => {
      // Check if actually active
      const isStreamActive = stream.active;
      const liveTracks = stream.getTracks().filter(t => t.readyState === 'live');

      // If dead, mark for cleanup
      if (!isStreamActive && liveTracks.length === 0) {
        streamsToRemove.push(stream);
        return;
      }

      // Add to active streams list with detailed info
      activeStreams.push({
        id: stream.id.substring(0, 8), // First 8 chars for display
        tag: stream._debugTag || 'Unknown', // Source identifier
        audio: liveTracks.filter(t => t.kind === 'audio').length,
        video: liveTracks.filter(t => t.kind === 'video').length,
      });
    });

    // Clean up after iteration completes (prevents Set modification during forEach)
    streamsToRemove.forEach(stream => this.trackedStreams.delete(stream));

    return {
      streams: activeStreams,
      recorderState: this.recorderState
    };
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    // Determine stats + logs
    const stats = this.getStats();
    this.listeners.forEach(cb => cb({ logs: [...this.logs], stats }));
  }
}

export const debugService = new DebugService();

// --- REACT COMPONENT ---
export function DebugOverlay() {
  const [data, setData] = useState({ logs: [], stats: { streams: [], recorderState: 'idle' } });
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // 1. Subscribe to log events
    const unsub = debugService.subscribe(setData);

    // 2. Poll every 500ms to update 'Live' status of tracks
    // (Track readyState changes don't fire events we can easily catch globally)
    const interval = setInterval(() => {
      debugService.notify();
    }, 500);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 'max(10px, env(safe-area-inset-bottom))',
          right: 10,
          zIndex: 99999,
          background: 'rgba(255,0,0,0.8)',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: 20,
          fontSize: 'max(12px, 0.75rem)'
        }}
      >
        🐞 Debug
      </button>
    );
  }

  const { stats, logs } = data;
  const totalMic = stats.streams.reduce((acc, s) => acc + s.audio, 0);
  const totalCam = stats.streams.reduce((acc, s) => acc + s.video, 0);
  const isClean = totalMic === 0 && totalCam === 0;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'min(50vh, 400px)',
      maxHeight: 'calc(100vh - env(safe-area-inset-bottom) - env(safe-area-inset-top))',
      backgroundColor: 'rgba(0,0,0,0.95)',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: 'max(11px, 0.75rem)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      borderTop: isClean ? '2px solid #00ff00' : '2px solid #ff0000',
      boxShadow: '0 -4px 10px rgba(0,0,0,0.5)',
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      {/* STATUS HEADER */}
      <div style={{
        padding: '8px',
        background: isClean ? '#003300' : '#330000',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #444'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <StatusBadge label="MIC" count={totalMic} />
          <StatusBadge label="CAM" count={totalCam} />
          <div style={{ color: '#aaa' }}>REC: <b style={{ color: '#fff' }}>{stats.recorderState}</b></div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: '#444',
            border: 'none',
            color: '#fff',
            padding: '4px 10px',
            fontSize: 'max(11px, 0.75rem)',
            cursor: 'pointer'
          }}
        >
          Hide
        </button>
      </div>

      {/* ACTIVE STREAMS LIST - LEAK DETECTION */}
      <div style={{
        padding: '8px',
        background: '#222',
        borderBottom: '1px solid #444',
        maxHeight: '120px',
        overflowY: 'auto'
      }}>
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>
          ACTIVE STREAMS ({stats.streams.length})
        </div>
        {stats.streams.length === 0 ? (
          <div style={{ color: '#666', fontSize: '11px' }}>- None -</div>
        ) : (
          stats.streams.map(s => (
            <div key={s.id} style={{
              display: 'flex',
              gap: '10px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#fff',
              padding: '2px 0'
            }}>
              <span style={{ color: '#55ffff' }}>{s.id}</span>
              <span style={{ color: '#ffff55' }}>[{s.tag}]</span>
              <span>🎤{s.audio} 📹{s.video}</span>
            </div>
          ))
        )}
      </div>

      {/* LOGS SCROLLER */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '5px' }}>
        {logs.map(log => (
          <div key={log.id} style={{ borderBottom: '1px solid #222', padding: '2px 0' }}>
            <span style={{ color: '#666', marginRight: 5 }}>{log.time}ms</span>
            <span style={{ color: getCatColor(log.category), fontWeight: 'bold' }}>[{log.category}]</span>
            <span style={{ marginLeft: 5 }}>{log.message}</span>
            {log.dataStr && <span style={{ color: '#888', marginLeft: 5, fontSize: '0.9em' }}>{log.dataStr}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ label, count }) {
  const isZero = count === 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: isZero ? '#444' : '#ff0000',
        boxShadow: isZero ? 'none' : '0 0 5px #ff0000'
      }} />
      <span>{label}: {count}</span>
    </div>
  );
}

function getCatColor(cat) {
  if (cat === 'HARDWARE') return '#ff5555';
  if (cat === 'RECORDER') return '#55ffff';
  return '#ffffff';
}
