/**
 * Firebase Storage & Download Service (C07) - Unit Tests
 * Tests for Firebase storage service with recording session integration
 */

import firebaseStorageService, {
  generateUploadPath,
  getDownloadUrl,
  download,
  deleteRecording,
  listRecordings,
  getRecording,
  cleanupFailedUploads,
  getQuotaInfo,
  fetchAllRecordings,
  fetchRecording
} from './firebaseStorage.js';

// Mock Firebase dependencies
jest.mock('./firebase/storage.js', () => ({
  getDownloadURL: jest.fn(),
  deleteFile: jest.fn(),
  getFileMetadata: jest.fn(),
  getSignedUrl: jest.fn()
}));

jest.mock('./firebase/firestore.js', () => ({
  getUserRecordingSessions: jest.fn(),
  getRecordingSession: jest.fn(),
  updateRecordingSession: jest.fn(),
  deleteStory: jest.fn()
}));

// Import mocked dependencies
import {
  getDownloadURL,
  deleteFile
} from './firebase/storage.js';
import {
  getUserRecordingSessions,
  getRecordingSession,
  updateRecordingSession
} from './firebase/firestore.js';

describe('FirebaseStorageService (C07)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firebaseStorageService.clearError();
  });

  describe('generateUploadPath', () => {
    it('generates storage path with correct format', () => {
      const path = generateUploadPath('session123', 'user456', 'recording.mp4');
      expect(path).toMatch(/^users\/user456\/recordings\/session123\/\d+_recording\.mp4$/);
    });

    it('handles files without extension', () => {
      const path = generateUploadPath('session123', 'user456', 'recording');
      expect(path).toMatch(/^users\/user456\/recordings\/session123\/\d+_recording\.mp4$/);
    });
  });

  describe('getDownloadUrl', () => {
    it('gets download URL from session ID', async () => {
      const mockSession = {
        id: 'session123',
        downloadUrl: 'https://firebase.storage/download-url'
      };
      getRecordingSession.mockResolvedValue(mockSession);

      const url = await getDownloadUrl('session123');
      expect(url).toBe('https://firebase.storage/download-url');
      expect(getRecordingSession).toHaveBeenCalledWith('session123');
    });

    it('generates fresh URL from storage path in session', async () => {
      const mockSession = {
        id: 'session123',
        storagePath: 'users/user456/recordings/session123/file.mp4',
        downloadUrl: null
      };
      getRecordingSession.mockResolvedValue(mockSession);
      getDownloadURL.mockResolvedValue('https://firebase.storage/fresh-url');

      const url = await getDownloadUrl('session123');
      expect(url).toBe('https://firebase.storage/fresh-url');
      expect(getDownloadURL).toHaveBeenCalledWith(mockSession.storagePath);
      expect(updateRecordingSession).toHaveBeenCalledWith('session123', { downloadUrl: 'https://firebase.storage/fresh-url' });
    });

    it('gets download URL from storage path directly', async () => {
      getDownloadURL.mockResolvedValue('https://firebase.storage/direct-url');

      const url = await getDownloadUrl('users/user456/recordings/session123/file.mp4');
      expect(url).toBe('https://firebase.storage/direct-url');
      expect(getDownloadURL).toHaveBeenCalledWith('users/user456/recordings/session123/file.mp4');
    });

    it('throws error for session with no storage path', async () => {
      const mockSession = {
        id: 'session123',
        downloadUrl: null,
        storagePath: null
      };
      getRecordingSession.mockResolvedValue(mockSession);

      await expect(getDownloadUrl('session123')).rejects.toThrow('has no storage path or download URL');
    });
  });

  describe('download', () => {
    it('downloads recording as blob', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/mp4' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob)
      });

      // Mock getDownloadUrl
      getRecordingSession.mockResolvedValue({
        id: 'session123',
        downloadUrl: 'https://firebase.storage/download-url'
      });

      const blob = await download('session123');
      expect(blob).toBe(mockBlob);
      expect(fetch).toHaveBeenCalledWith('https://firebase.storage/download-url');
    });

    it('throws error on failed download', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      getRecordingSession.mockResolvedValue({
        id: 'session123',
        downloadUrl: 'https://firebase.storage/download-url'
      });

      await expect(download('session123')).rejects.toThrow('Download failed: 404 Not Found');
    });
  });

  describe('deleteRecording', () => {
    it('deletes recording by session ID', async () => {
      const mockSession = {
        id: 'session123',
        storagePath: 'users/user456/recordings/session123/file.mp4'
      };
      getRecordingSession.mockResolvedValue(mockSession);
      deleteFile.mockResolvedValue();
      updateRecordingSession.mockResolvedValue();

      await deleteRecording('session123');
      
      expect(deleteFile).toHaveBeenCalledWith(mockSession.storagePath, { cleanupFirestore: false });
      expect(updateRecordingSession).toHaveBeenCalledWith('session123', {
        status: 'deleted',
        deletedAt: expect.any(Date),
        storagePath: null,
        downloadUrl: null
      });
    });

    it('deletes recording by storage path', async () => {
      const storagePath = 'users/user456/recordings/session123/file.mp4';
      deleteFile.mockResolvedValue();

      await deleteRecording(storagePath);
      
      expect(deleteFile).toHaveBeenCalledWith(storagePath, { cleanupFirestore: false });
    });
  });

  describe('listRecordings', () => {
    it('lists recordings with filters', async () => {
      const mockSessions = [
        {
          id: 'session1',
          sessionId: 'session1',
          userId: 'user1',
          fileType: 'audio',
          status: 'completed',
          createdAt: new Date('2023-01-01'),
          downloadUrl: 'https://download1'
        },
        {
          id: 'session2',
          sessionId: 'session2',
          userId: 'user1',
          fileType: 'video',
          status: 'completed',
          createdAt: new Date('2023-01-02'),
          downloadUrl: 'https://download2'
        }
      ];
      getUserRecordingSessions.mockResolvedValue(mockSessions);

      const recordings = await listRecordings({ userId: 'user1', fileType: 'audio' });
      
      expect(recordings).toHaveLength(1);
      expect(recordings[0]).toMatchObject({
        id: 'session1',
        docId: 'session1',
        fileType: 'audio',
        downloadURL: 'https://download1'
      });
    });

    it('excludes deleted recordings by default', async () => {
      const mockSessions = [
        { id: 'session1', status: 'completed', fileType: 'audio', createdAt: new Date() },
        { id: 'session2', status: 'deleted', fileType: 'audio', createdAt: new Date() }
      ];
      getUserRecordingSessions.mockResolvedValue(mockSessions);

      const recordings = await listRecordings({ userId: 'user1' });
      
      expect(recordings).toHaveLength(1);
      expect(recordings[0].id).toBe('session1');
    });
  });

  describe('getRecording', () => {
    it('gets single recording by ID', async () => {
      const mockSession = {
        id: 'session123',
        sessionId: 'session123',
        userId: 'user456',
        fileType: 'audio',
        downloadUrl: 'https://download-url',
        createdAt: new Date('2023-01-01')
      };
      getRecordingSession.mockResolvedValue(mockSession);

      const recording = await getRecording('session123');
      
      expect(recording).toMatchObject({
        id: 'session123',
        docId: 'session123',
        fileType: 'audio',
        downloadURL: 'https://download-url'
      });
    });

    it('throws error for non-existent recording', async () => {
      getRecordingSession.mockResolvedValue(null);

      await expect(getRecording('nonexistent')).rejects.toThrow('Recording not found');
    });
  });

  describe('cleanupFailedUploads', () => {
    it('cleans up failed uploads', async () => {
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const mockSessions = [
        {
          id: 'failed1',
          status: 'failed',
          createdAt: new Date(cutoffDate.getTime() - 1000), // Older than cutoff
          storagePath: 'path/to/failed1'
        },
        {
          id: 'recent',
          status: 'failed',
          createdAt: new Date(), // Recent
          storagePath: 'path/to/recent'
        }
      ];
      getUserRecordingSessions.mockResolvedValue(mockSessions);
      deleteFile.mockResolvedValue();
      updateRecordingSession.mockResolvedValue();

      const result = await cleanupFailedUploads();
      
      expect(result.sessionsFound).toBe(1);
      expect(result.sessionsCleanedUp).toBe(1);
      expect(result.storageFilesDeleted).toBe(1);
      expect(deleteFile).toHaveBeenCalledWith('path/to/failed1', { cleanupFirestore: false });
      expect(updateRecordingSession).toHaveBeenCalledWith('failed1', {
        status: 'cleaned_up',
        cleanedUpAt: expect.any(Date)
      });
    });

    it('performs dry run without changes', async () => {
      const mockSessions = [
        { id: 'failed1', status: 'failed', createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) }
      ];
      getUserRecordingSessions.mockResolvedValue(mockSessions);

      const result = await cleanupFailedUploads({ dryRun: true });
      
      expect(result.sessionsFound).toBe(1);
      expect(result.sessionsCleanedUp).toBe(0);
      expect(deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('compatibility functions', () => {
    it('fetchAllRecordings calls listRecordings', async () => {
      const mockRecordings = [{ id: 'test' }];
      getUserRecordingSessions.mockResolvedValue([{
        id: 'test',
        sessionId: 'test',
        userId: 'user',
        status: 'completed',
        createdAt: new Date()
      }]);

      const result = await fetchAllRecordings({ userId: 'user' });
      expect(result).toHaveLength(1);
    });

    it('fetchRecording calls getRecording', async () => {
      const mockSession = {
        id: 'test',
        sessionId: 'test',
        userId: 'user',
        fileType: 'audio',
        downloadUrl: 'https://test'
      };
      getRecordingSession.mockResolvedValue(mockSession);

      const result = await fetchRecording('test');
      expect(result.id).toBe('test');
    });
  });

  describe('error handling', () => {
    it('maps quota exceeded errors', async () => {
      const quotaError = { code: 'storage/quota-exceeded' };
      getRecordingSession.mockRejectedValue(quotaError);

      await expect(getDownloadUrl('session123')).rejects.toThrow('Storage quota exceeded');
    });

    it('maps not found errors', async () => {
      const notFoundError = { code: 'storage/object-not-found' };
      getRecordingSession.mockRejectedValue(notFoundError);

      await expect(getDownloadUrl('session123')).rejects.toThrow('Recording not found');
    });

    it('maps network errors', async () => {
      const networkError = new Error('network failure');
      getRecordingSession.mockRejectedValue(networkError);

      await expect(getDownloadUrl('session123')).rejects.toThrow('Network error');
    });
  });
});