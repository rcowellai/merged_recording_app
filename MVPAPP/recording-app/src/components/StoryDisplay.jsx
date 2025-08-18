import React, { useState, useEffect, useRef } from 'react';
import { 
  subscribeToUserStories, 
  getMediaDownloadURL, 
  formatDuration, 
  formatDate,
  downloadStoryMedia 
} from '../services/stories.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import StatusMessage from './StatusMessage.jsx';

const StoryDisplay = ({ userId }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingStory, setPlayingStory] = useState(null);
  const [audioUrls, setAudioUrls] = useState({});
  const [videoUrls, setVideoUrls] = useState({});
  const [expandedTranscripts, setExpandedTranscripts] = useState({});
  const audioRefs = useRef({});

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let unsubscribe;
    
    try {
      unsubscribe = subscribeToUserStories(userId, (updatedStories, err) => {
        if (err) {
          console.error('Error in stories subscription:', err);
          setError('Failed to load stories. Please try again.');
          setLoading(false);
          return;
        }
        
        if (updatedStories) {
          setStories(updatedStories);
          // Pre-load audio URLs for the first few stories
          loadMediaUrls(updatedStories.slice(0, 3));
        }
        setLoading(false);
      });
    } catch (err) {
      console.error('Error setting up stories subscription:', err);
      setError('Failed to connect to stories. Please refresh the page.');
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  const loadMediaUrls = async (storiesToLoad) => {
    const audioUrlPromises = {};
    const videoUrlPromises = {};

    storiesToLoad.forEach(story => {
      if (story.audioUrl && !audioUrls[story.id]) {
        audioUrlPromises[story.id] = getMediaDownloadURL(story.audioUrl);
      }
      if (story.videoUrl && !videoUrls[story.id]) {
        videoUrlPromises[story.id] = getMediaDownloadURL(story.videoUrl);
      }
    });

    try {
      const audioResults = await Promise.allSettled(Object.entries(audioUrlPromises).map(
        async ([id, promise]) => ({ id, url: await promise })
      ));
      
      const videoResults = await Promise.allSettled(Object.entries(videoUrlPromises).map(
        async ([id, promise]) => ({ id, url: await promise })
      ));

      // Update audio URLs
      const newAudioUrls = { ...audioUrls };
      audioResults.forEach(result => {
        if (result.status === 'fulfilled') {
          newAudioUrls[result.value.id] = result.value.url;
        }
      });
      setAudioUrls(newAudioUrls);

      // Update video URLs
      const newVideoUrls = { ...videoUrls };
      videoResults.forEach(result => {
        if (result.status === 'fulfilled') {
          newVideoUrls[result.value.id] = result.value.url;
        }
      });
      setVideoUrls(newVideoUrls);
    } catch (error) {
      console.error('Error loading media URLs:', error);
    }
  };

  const handlePlayPause = async (story) => {
    const audioRef = audioRefs.current[story.id];
    
    if (playingStory === story.id) {
      // Pause current audio
      if (audioRef) {
        audioRef.pause();
      }
      setPlayingStory(null);
    } else {
      // Stop any currently playing audio
      if (playingStory && audioRefs.current[playingStory]) {
        audioRefs.current[playingStory].pause();
      }
      
      // Load audio URL if not already loaded
      if (!audioUrls[story.id] && story.audioUrl) {
        try {
          const url = await getMediaDownloadURL(story.audioUrl);
          setAudioUrls(prev => ({ ...prev, [story.id]: url }));
        } catch (error) {
          console.error('Error loading audio URL:', error);
          return;
        }
      }
      
      // Play new audio
      setPlayingStory(story.id);
      if (audioRef && audioUrls[story.id]) {
        audioRef.play().catch(console.error);
      }
    }
  };

  const handleAudioEnded = (storyId) => {
    if (playingStory === storyId) {
      setPlayingStory(null);
    }
  };

  const toggleTranscript = (storyId) => {
    setExpandedTranscripts(prev => ({
      ...prev,
      [storyId]: !prev[storyId]
    }));
  };

  const handleDownload = async (story, type = 'audio') => {
    try {
      await downloadStoryMedia(story, type);
    } catch (error) {
      console.error('Download failed:', error);
      // You could show a toast notification here
    }
  };

  if (loading) {
    return (
      <div className="story-display">
        <div className="story-display-header">
          <h2>My Stories</h2>
        </div>
        <LoadingSpinner message="Loading your stories..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="story-display">
        <div className="story-display-header">
          <h2>My Stories</h2>
        </div>
        <StatusMessage
          status="error"
          title="Error Loading Stories"
          message={error}
          actionButton={
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="story-display">
        <div className="story-display-header">
          <h2>My Stories</h2>
        </div>
        <StatusMessage
          status="info"
          title="No Stories Yet"
          message="You haven't recorded any stories yet. Create a prompt and record your first memory!"
          actionButton={
            <a 
              href="https://loveretold.com" 
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Create Your First Story
            </a>
          }
        />
      </div>
    );
  }

  return (
    <div className="story-display">
      <div className="story-display-header">
        <h2>My Stories</h2>
        <p className="story-count">{stories.length} {stories.length === 1 ? 'story' : 'stories'}</p>
      </div>

      <div className="stories-list">
        {stories.map((story) => (
          <div key={story.id} className="story-card">
            <div className="story-header">
              <h3 className="story-question">{story.question}</h3>
              <div className="story-meta">
                <span className="story-date">{formatDate(story.recordedAt)}</span>
                <span className="story-duration">{formatDuration(story.duration)}</span>
                {story.videoUrl && <span className="story-type">Video</span>}
              </div>
            </div>

            <div className="story-media">
              {story.videoUrl && videoUrls[story.id] ? (
                <div className="video-container">
                  <video
                    controls
                    preload="metadata"
                    className="story-video"
                    src={videoUrls[story.id]}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              ) : (
                <div className="audio-player">
                  <button
                    className={`play-button ${playingStory === story.id ? 'playing' : ''}`}
                    onClick={() => handlePlayPause(story)}
                    disabled={!story.audioUrl}
                  >
                    {playingStory === story.id ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    )}
                  </button>
                  
                  <div className="audio-info">
                    <span className="audio-title">Audio Recording</span>
                    <span className="audio-duration">{formatDuration(story.duration)}</span>
                  </div>
                  
                  {audioUrls[story.id] && (
                    <audio
                      ref={el => audioRefs.current[story.id] = el}
                      src={audioUrls[story.id]}
                      onEnded={() => handleAudioEnded(story.id)}
                      preload="metadata"
                    />
                  )}
                </div>
              )}
            </div>

            {story.transcript && (
              <div className="story-transcript">
                <div className="transcript-header">
                  <h4>Transcript</h4>
                  <button
                    className="transcript-toggle"
                    onClick={() => toggleTranscript(story.id)}
                  >
                    {expandedTranscripts[story.id] ? 'Show Less' : 'Show More'}
                  </button>
                </div>
                <div className={`transcript-content ${expandedTranscripts[story.id] ? 'expanded' : ''}`}>
                  <p>{story.transcript}</p>
                </div>
              </div>
            )}

            <div className="story-actions">
              <button
                className="action-btn"
                onClick={() => handleDownload(story, 'audio')}
                title="Download audio"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                Download
              </button>
              
              {story.videoUrl && (
                <button
                  className="action-btn"
                  onClick={() => handleDownload(story, 'video')}
                  title="Download video"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                  Video
                </button>
              )}
              
              <button
                className="action-btn"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'My Memory',
                      text: `"${story.question}" - ${story.transcript.substring(0, 100)}...`,
                      url: window.location.href
                    });
                  } else {
                    navigator.clipboard.writeText(story.transcript);
                    // You could show a toast notification here
                  }
                }}
                title="Share story"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.50-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92S19.61 16.08 18 16.08z"/>
                </svg>
                Share
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoryDisplay;