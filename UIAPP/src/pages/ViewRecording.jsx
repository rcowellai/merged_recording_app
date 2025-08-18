/**
 * ViewRecording.jsx
 * -----------------
 * A dedicated page for playing back a specific recording
 * based on the doc ID in the URL. Fetches the doc from 
 * Firestore, loads the media file from Storage, and shows
 * either video or audio controls.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import PromptCard from '../components/PromptCard';
import { LAYOUT } from '../config';

// Instead of importing Firestore directly:
// import { doc, getDoc } from 'firebase/firestore';
// import { db } from '../services/firebase';

import { fetchRecording } from '../services/localRecordingService';

function ViewRecording() {
  const { docId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Firestore doc fields
  const [downloadURL, setDownloadURL] = useState(null);
  const [fileType, setFileType] = useState(null);

  const videoRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchDocData() {
      try {
        const data = await fetchRecording(docId);
        if (!data) {
          throw new Error('No matching document found.');
        }
        if (isMounted) {
          setDownloadURL(data.downloadURL);
          setFileType(data.fileType);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchDocData();
    return () => {
      isMounted = false;
    };
  }, [docId]);

  const handleLoadedMetadata = () => {
    // Metadata loaded - could be used for future enhancements
  };

  const handleTimeUpdate = () => {
    // Time update - could be used for future enhancements
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="main-layout-container">
          <PromptCard />
          <p style={{ textAlign: 'center', marginTop: '40px' }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="main-layout-container">
          <PromptCard />
          <p style={{ color: 'red', textAlign: 'center', marginTop: '40px' }}>
            Error: {error}
          </p>
        </div>
      </div>
    );
  }

  if (!downloadURL || !fileType) {
    return (
      <div className="page-container">
        <div className="main-layout-container">
          <PromptCard />
          <p style={{ textAlign: 'center', marginTop: '40px' }}>
            No recording found.
          </p>
        </div>
      </div>
    );
  }

  const isVideo = (fileType === 'video');

  return (
    <div className="page-container">
      <div className="main-layout-container">
        <PromptCard />

        <div style={{ marginTop: LAYOUT.MARGIN_TOP_MEDIUM }}>
          {isVideo ? (
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <video
                ref={videoRef}
                src={downloadURL}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                playsInline
                style={{
                  display: 'block',
                  width: '100%',
                  maxHeight: '220px',
                  borderRadius: '8px',
                  backgroundColor: '#000',
                }}
                controls
              />
            </div>
          ) : (
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <audio
                ref={videoRef}
                src={downloadURL}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                style={{ width: '100%' }}
                controls
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewRecording;
