// ----------------------------------------------------------
// AdminPage.jsx
// ----------------------------------------------------------
/**
 * AdminPage.jsx
 * -------------
 * Allows an admin user to filter and view recordings
 * by date and media type. Fetches metadata from Firestore
 * via the firebaseRecordingService. Displays a QR code to 
 * open each recording. Now sorts the filtered results in
 * descending time order so the newest recording is on top.
 */

import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { COLORS, LAYOUT } from '../config';
import debugLogger from '../utils/debugLogger';

// Import Firebase storage service layer (C07)
import { fetchAllRecordings } from '../services/firebaseStorage';
// Fallback to local storage service
import { fetchAllRecordings as fetchAllRecordingsLocal } from '../services/localRecordingService';
import { ENV_CONFIG } from '../config';

function AdminPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const [mediaType, setMediaType] = useState('audio');
  const [allRecordings, setAllRecordings] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);

  debugLogger.componentMounted('AdminPage');

  // On mount, fetch all docs from "recordings"
  useEffect(() => {
    async function loadRecordings() {
      try {
        let results;
        
        if (ENV_CONFIG.USE_FIREBASE && ENV_CONFIG.FIREBASE_STORAGE_ENABLED) {
          console.log('📋 AdminPage: Using Firebase storage (C07)');
          try {
            // Use Firebase storage service (C07)
            results = await fetchAllRecordings();
          } catch (firebaseError) {
            console.warn('⚠️ AdminPage: Firebase failed, falling back to localStorage:', firebaseError);
            results = await fetchAllRecordingsLocal();
          }
        } else {
          console.log('📋 AdminPage: Using localStorage service');
          results = await fetchAllRecordingsLocal();
        }
        
        setAllRecordings(results);
      } catch (err) {
        console.error('Error fetching recordings:', err);
        setAllRecordings([]); // Set empty array on error
      }
    }
    loadRecordings();
  }, []);

  // Helper to get a numeric timestamp from either createdAt or fileName
  function getTimestamp(rec) {
    if (rec.createdAt?.toDate) {
      // Firestore's createdAt
      return rec.createdAt.toDate().getTime(); 
    } else if (rec.fileName) {
      // Parse from fileName, e.g. "2025-01-26_145210_audio.webm"
      // We'll convert "2025-01-26_145210" into a Date if possible.
      const [datePart, timePart] = rec.fileName.split('_'); 
      // datePart => "2025-01-26"
      // timePart => "145210"
      const [yr, mo, dy] = datePart.split('-');
      const year = parseInt(yr, 10);
      const month = parseInt(mo, 10) - 1; // zero-based
      const day = parseInt(dy, 10);

      if (timePart?.length >= 6) {
        const hh = parseInt(timePart.slice(0, 2), 10);
        const mm = parseInt(timePart.slice(2, 4), 10);
        const ss = parseInt(timePart.slice(4, 6), 10);
        const maybeDate = new Date(year, month, day, hh, mm, ss);
        return maybeDate.getTime();
      } else {
        // If we can't parse properly, default to 0
        return 0;
      }
    }
    // If neither field is available, default to 0
    return 0;
  }

  // Handle user clicking Submit
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedDate) {
      alert('Please select a date.');
      return;
    }

    // e.g. "2025-01-26"
    const [, monthStr, dayStr] = selectedDate.split('-');
    const dayNum = parseInt(dayStr, 10);
    const monthNum = parseInt(monthStr, 10);

    // Filter local array
    const results = allRecordings.filter((rec) => {
      // Check media type
      if (rec.fileType !== mediaType) return false;

      // Extract dd/mm from createdAt or fileName
      let d, m;
      if (rec.createdAt?.toDate) {
        const dt = rec.createdAt.toDate();
        d = dt.getDate();      // 1..31
        m = dt.getMonth() + 1; // 1..12
      } else if (rec.fileName) {
        // e.g. "2025-01-26_145210_audio.webm"
        const fileParts = rec.fileName.split('_');
        const datePart = fileParts[0].split('-'); 
        // datePart => ["2025","01","26"]
        d = parseInt(datePart[2], 10);
        m = parseInt(datePart[1], 10);
      } else {
        return false;
      }

      return (d === dayNum && m === monthNum);
    });

    // NEW: Sort results in descending order by time
    results.sort((a, b) => {
      const aTime = getTimestamp(a);
      const bTime = getTimestamp(b);
      // "bTime - aTime" => newest first
      return bTime - aTime;
    });

    setFilteredResults(results);
  };

  return (
    <div className="page-container" style={{ padding: '20px' }}>
      <div
        className="main-layout-container"
        style={{
          backgroundColor: COLORS.PRIMARY_LIGHT,
          maxWidth: LAYOUT.MAX_WIDTH,
          margin: '0 auto',
          padding: '20px'
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
          Admin - Filter Recordings
        </h2>

        {/* Debug Tools Section */}
        <div style={{ 
          backgroundColor: '#f0f0f0', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '2px solid #e0e0e0'
        }}>
          <h3>🐛 Debug Tools</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <button 
              onClick={() => window.enableDebug?.()} 
              style={{ padding: '8px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Enable Debug
            </button>
            <button 
              onClick={() => window.disableDebug?.()} 
              style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Disable Debug
            </button>
            <button 
              onClick={() => console.table(window.getDebugErrors?.() || [])} 
              style={{ padding: '8px 12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Show Errors
            </button>
            <button 
              onClick={() => window.clearDebugErrors?.()} 
              style={{ padding: '8px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Clear Errors
            </button>
          </div>
          
          <div>
            <h4>🧪 Test Links</h4>
            <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
              <li><a href="/?sessionId=test-session-123" style={{ color: '#007bff' }}>Test Session (Query)</a></li>
              <li><a href="/test-session-123" style={{ color: '#007bff' }}>Test Session (Path)</a></li>
              <li><a href="/j4e19zc-firstspa-myCtZuIW-myCtZuIW-1755603545" style={{ color: '#007bff' }}>Real Session Format</a></li>
            </ul>
          </div>
          
          <div>
            <h4>💡 Debug Commands (Console)</h4>
            <code style={{ display: 'block', backgroundColor: '#fff', padding: '8px', borderRadius: '4px', fontSize: '12px' }}>
              window.enableDebug() // Enable detailed logging<br/>
              window.getDebugErrors() // View stored errors<br/>
              window.debugLogger.log('info', 'TEST', 'Debug message') // Test logging
            </code>
          </div>
        </div>

        {/* Filter Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: LAYOUT.MARGIN_TOP_SMALL }}>
          <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
            <label style={{ marginBottom: '6px' }}>
              Select Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                fontSize: '1rem',
                padding: '6px',
                borderRadius: '6px',
                border: '1px solid #ccc'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ marginRight: '20px' }}>Media Type:</label>
            <label style={{ marginRight: '16px' }}>
              <input
                type="radio"
                name="mediaType"
                value="audio"
                checked={mediaType === 'audio'}
                onChange={() => setMediaType('audio')}
              />
              Audio
            </label>
            <label>
              <input
                type="radio"
                name="mediaType"
                value="video"
                checked={mediaType === 'video'}
                onChange={() => setMediaType('video')}
              />
              Video
            </label>
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: COLORS.PRIMARY_DARK,
              color: COLORS.PRIMARY_LIGHT,
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              padding: '8px 14px',
              cursor: 'pointer'
            }}
          >
            Submit
          </button>
        </form>

        {/* Results */}
        <div style={{ marginTop: LAYOUT.MARGIN_TOP_MEDIUM }}>
          {filteredResults.map((rec) => {
            // Extract dd/mm, hh:mm for display
            let dd = '--', mm = '--';
            let HH = '--', Min = '--';

            if (rec.createdAt?.toDate) {
              const dt = rec.createdAt.toDate();
              dd = String(dt.getDate()).padStart(2, '0');
              mm = String(dt.getMonth() + 1).padStart(2, '0');
              HH = String(dt.getHours()).padStart(2, '0');
              Min = String(dt.getMinutes()).padStart(2, '0');
            } else if (rec.fileName) {
              const [datePart, timePart] = rec.fileName.split('_');
              const [, mo, dy] = datePart.split('-');
              dd = dy;
              mm = mo;
              if (timePart?.length >= 6) {
                HH = timePart.slice(0, 2);
                Min = timePart.slice(2, 4);
              }
            }

            const docUrl = `${window.location.origin}/view/${rec.id}`;

            return (
              <div
                key={rec.id}
                style={{
                  border: '1px solid #ccc',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  backgroundColor: '#fff'
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <strong>Date:</strong> {dd}/{mm}
                  <span style={{ marginLeft: '12px' }}>
                    <strong>Time:</strong> {HH}:{Min}
                  </span>
                </div>

                {/* QR code => link to /view/:docId */}
                <div style={{ marginBottom: '8px' }}>
                  <QRCodeCanvas value={docUrl} size={LAYOUT.QR_CODE_SIZE} includeMargin />
                </div>

                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline', color: '#333' }}
                >
                  Open Recording
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
