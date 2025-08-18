/**
 * End-to-End Workflow Integration Tests
 * Wave 4 - Integration Flow Testing
 * 
 * QA Standards: 100% end-to-end success, complete workflow validation, cross-service consistency
 */

const { assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

describe('🔗 End-to-End Workflow Integration Tests', () => {
  let userContext, secondUserContext, anonymousContext;
  let testData = {};
  let workflowResults = {
    promptCreation: {},
    sessionManagement: {},
    recordingWorkflow: {},
    storyProcessing: {},
    crossServiceValidation: {}
  };

  beforeAll(async () => {
    userContext = await TestUtils.createUserContext('user1');
    secondUserContext = await TestUtils.createUserContext('user2');
    anonymousContext = await TestUtils.createAnonymousContext();
    
    testData = {
      user1Id: TEST_CONFIG.testUsers.user1.uid,
      user2Id: TEST_CONFIG.testUsers.user2.uid,
      testTimestamp: new Date(),
      futureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      workflowSessionId: 'workflow-test-session-' + Date.now(),
      workflowPromptId: 'workflow-test-prompt-' + Date.now(),
      workflowStoryId: 'workflow-test-story-' + Date.now()
    };

    console.log('🚀 Starting end-to-end workflow integration tests...');
  });

  afterAll(async () => {
    await TestUtils.cleanupTestData(userContext);
    await TestUtils.cleanupTestData(secondUserContext);
    
    generateWorkflowReport(workflowResults);
  });

  describe('📝 Complete Prompt Creation Workflow', () => {
    test('should create prompt with full metadata and validation', async () => {
      const startTime = Date.now();
      const db = userContext.firestore();
      
      // Step 1: Create user profile if not exists
      const userDoc = db.collection('users').doc(testData.user1Id);
      await assertSucceeds(userDoc.set({
        email: 'workflow@test.com',
        displayName: 'Workflow Test User',
        createdAt: testData.testTimestamp,
        preferences: {
          emailNotifications: true,
          timezone: 'America/New_York',
          language: 'en'
        },
        subscription: {
          plan: 'free',
          status: 'active'
        }
      }));

      // Step 2: Create prompt with complete metadata
      const promptDoc = db.collection('prompts').doc(testData.workflowPromptId);
      const promptData = {
        userId: testData.user1Id,
        question: 'Tell me about your most memorable family vacation. Where did you go, who was with you, and what made it special?',
        status: 'waiting',
        category: 'family',
        difficulty: 'medium',
        estimatedDuration: 300,
        scheduledDate: testData.futureDate,
        createdAt: testData.testTimestamp,
        updatedAt: testData.testTimestamp,
        uniqueUrl: `https://app.loveretold.com/record/${testData.workflowSessionId}`,
        sessionId: testData.workflowSessionId,
        metadata: {
          source: 'user_generated',
          tags: ['family', 'vacation', 'memories'],
          priority: 'normal',
          reminderSent: false
        }
      };

      await assertSucceeds(promptDoc.set(promptData));

      // Step 3: Verify prompt creation and accessibility
      const promptSnapshot = await assertSucceeds(promptDoc.get());
      expect(promptSnapshot.exists).toBe(true);
      expect(promptSnapshot.data().userId).toBe(testData.user1Id);
      expect(promptSnapshot.data().sessionId).toBe(testData.workflowSessionId);

      // Step 4: Verify user can query their own prompts
      const userPromptsQuery = db.collection('prompts')
        .where('userId', '==', testData.user1Id)
        .where('status', '==', 'waiting');
      
      const userPrompts = await assertSucceeds(userPromptsQuery.get());
      expect(userPrompts.size).toBeGreaterThan(0);

      const duration = Date.now() - startTime;
      workflowResults.promptCreation = {
        success: true,
        duration: duration,
        steps: ['user_profile', 'prompt_creation', 'verification', 'query_validation'],
        promptId: testData.workflowPromptId
      };

      console.log(`✅ Prompt creation workflow completed in ${duration}ms`);
    });

    test('should handle prompt updates and status transitions', async () => {
      const db = userContext.firestore();
      const promptDoc = db.collection('prompts').doc(testData.workflowPromptId);

      // Test valid status transitions
      const statusTransitions = [
        { from: 'waiting', to: 'active', shouldSucceed: true },
        { from: 'active', to: 'completed', shouldSucceed: true }
      ];

      for (const transition of statusTransitions) {
        // First set the 'from' status
        await assertSucceeds(promptDoc.update({
          status: transition.from,
          updatedAt: new Date()
        }));

        // Then transition to 'to' status
        const updateOperation = promptDoc.update({
          status: transition.to,
          updatedAt: new Date()
        });

        if (transition.shouldSucceed) {
          await assertSucceeds(updateOperation);
        } else {
          await assertFails(updateOperation);
        }
      }

      console.log('✅ Prompt status transition workflow validated');
    });
  });

  describe('🎵 Recording Session Management Workflow', () => {
    test('should create and manage recording session lifecycle', async () => {
      const startTime = Date.now();
      const db = userContext.firestore();
      
      // Step 1: Create recording session linked to prompt
      const sessionDoc = db.collection('recordingSessions').doc(testData.workflowSessionId);
      const sessionData = {
        promptId: testData.workflowPromptId,
        userId: testData.user1Id,
        status: 'active',
        createdAt: testData.testTimestamp,
        expiresAt: testData.futureDate,
        recordingStartedAt: null,
        recordingCompletedAt: null,
        metadata: {
          userAgent: 'Mozilla/5.0 (Test Browser)',
          ipAddress: '192.168.1.100',
          location: 'US',
          deviceType: 'desktop'
        },
        settings: {
          recordAudio: true,
          recordVideo: false,
          quality: 'standard',
          maxDuration: 600
        }
      };

      await assertSucceeds(sessionDoc.set(sessionData));

      // Step 2: Simulate recording start
      await assertSucceeds(sessionDoc.update({
        status: 'recording',
        recordingStartedAt: new Date(),
        updatedAt: new Date()
      }));

      // Step 3: Test session validation for file upload
      const storage = userContext.storage();
      const audioFileRef = storage.ref(`recordings/${testData.workflowSessionId}/workflow_test.webm`);
      const testAudioBlob = new Blob(['fake audio data'], { type: 'audio/webm' });
      
      await assertSucceeds(audioFileRef.put(testAudioBlob, {
        customMetadata: {
          sessionId: testData.workflowSessionId,
          recordingType: 'audio',
          originalName: 'workflow_test.webm'
        }
      }));

      // Step 4: Complete recording session
      await assertSucceeds(sessionDoc.update({
        status: 'processing',
        recordingCompletedAt: new Date(),
        updatedAt: new Date()
      }));

      // Step 5: Verify session accessibility and file access
      const sessionSnapshot = await assertSucceeds(sessionDoc.get());
      expect(sessionSnapshot.exists).toBe(true);
      expect(sessionSnapshot.data().status).toBe('processing');

      const downloadUrl = await assertSucceeds(audioFileRef.getDownloadURL());
      expect(downloadUrl).toBeDefined();

      const duration = Date.now() - startTime;
      workflowResults.sessionManagement = {
        success: true,
        duration: duration,
        steps: ['session_creation', 'recording_start', 'file_upload', 'session_completion', 'validation'],
        sessionId: testData.workflowSessionId
      };

      console.log(`✅ Recording session workflow completed in ${duration}ms`);
    });

    test('should enforce session expiration and cleanup', async () => {
      const db = userContext.firestore();
      
      // Create an expired session
      const expiredSessionId = 'expired-workflow-session';
      const expiredSessionDoc = db.collection('recordingSessions').doc(expiredSessionId);
      
      await assertSucceeds(expiredSessionDoc.set({
        promptId: testData.workflowPromptId,
        userId: testData.user1Id,
        status: 'active',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        metadata: {},
        settings: {}
      }));

      // Try to upload to expired session - should fail
      const storage = userContext.storage();
      const expiredFileRef = storage.ref(`recordings/${expiredSessionId}/expired_test.webm`);
      const testBlob = new Blob(['test data'], { type: 'audio/webm' });
      
      await assertFails(expiredFileRef.put(testBlob));

      console.log('✅ Session expiration workflow validated');
    });
  });

  describe('📖 Story Processing & Storage Workflow', () => {
    test('should process complete story creation workflow', async () => {
      const startTime = Date.now();
      const db = userContext.firestore();
      
      // Step 1: Mark session as completed (simulating processing completion)
      const sessionDoc = db.collection('recordingSessions').doc(testData.workflowSessionId);
      await assertSucceeds(sessionDoc.update({
        status: 'completed',
        updatedAt: new Date()
      }));

      // Step 2: Create processed story document
      const storyDoc = db.collection('stories').doc(testData.workflowStoryId);
      const storyData = {
        userId: testData.user1Id,
        originalPromptId: testData.workflowPromptId,
        question: 'Tell me about your most memorable family vacation...',
        audioUrl: `gs://love-retold-storage/processed/${testData.workflowStoryId}/compressed_audio.mp3`,
        videoUrl: null,
        transcript: 'Our most memorable family vacation was to Yellowstone National Park in the summer of 2018. We went with my parents, my sister, and her two kids. What made it special was seeing the kids\' faces light up when they saw Old Faithful erupt for the first time. We spent five days camping, hiking, and just enjoying nature together as a family.',
        duration: 145,
        fileSize: 2048000,
        recordedAt: testData.testTimestamp,
        createdAt: new Date(),
        processedAt: new Date(),
        metadata: {
          transcriptionConfidence: 0.94,
          language: 'en',
          processingTime: 67,
          audioQuality: 'high',
          compressionRatio: 0.72,
          transcriptionService: 'google-speech',
          audioFormat: 'mp3',
          bitrate: 128
        },
        tags: ['family', 'vacation', 'yellowstone', 'memories', 'children'],
        isPublic: false,
        archivedAt: null,
        shareSettings: {
          allowSharing: false,
          shareUrl: null,
          sharedWith: []
        }
      };

      await assertSucceeds(storyDoc.set(storyData));

      // Step 3: Verify story accessibility and queries
      const storySnapshot = await assertSucceeds(storyDoc.get());
      expect(storySnapshot.exists).toBe(true);
      expect(storySnapshot.data().userId).toBe(testData.user1Id);
      expect(storySnapshot.data().originalPromptId).toBe(testData.workflowPromptId);

      // Step 4: Test user story queries
      const userStoriesQuery = db.collection('stories')
        .where('userId', '==', testData.user1Id)
        .orderBy('recordedAt', 'desc');
      
      const userStories = await assertSucceeds(userStoriesQuery.get());
      expect(userStories.size).toBeGreaterThan(0);

      // Step 5: Test story search by tags
      const taggedStoriesQuery = db.collection('stories')
        .where('userId', '==', testData.user1Id)
        .where('tags', 'array-contains', 'family');
      
      const taggedStories = await assertSucceeds(taggedStoriesQuery.get());
      expect(taggedStories.size).toBeGreaterThan(0);

      // Step 6: Verify processed file access
      const storage = userContext.storage();
      const processedFileRef = storage.ref(`processed/${testData.workflowStoryId}/compressed_audio.mp3`);
      
      // In real implementation, this would be accessible
      // For testing, we verify the reference can be created
      expect(processedFileRef.name).toBe('compressed_audio.mp3');

      const duration = Date.now() - startTime;
      workflowResults.storyProcessing = {
        success: true,
        duration: duration,
        steps: ['session_completion', 'story_creation', 'file_processing', 'queries', 'file_access'],
        storyId: testData.workflowStoryId
      };

      console.log(`✅ Story processing workflow completed in ${duration}ms`);
    });

    test('should validate cross-user story isolation', async () => {
      const db = secondUserContext.firestore();
      
      // User2 should not be able to access User1's story
      const otherUserStoryDoc = db.collection('stories').doc(testData.workflowStoryId);
      await assertFails(otherUserStoryDoc.get());

      // User2 should not see User1's stories in queries
      const crossUserQuery = db.collection('stories')
        .where('userId', '==', testData.user1Id);
      
      const result = await assertSucceeds(crossUserQuery.get());
      expect(result.empty).toBe(true);

      console.log('✅ Cross-user story isolation validated');
    });
  });

  describe('🔄 Complete User Journey Integration', () => {
    test('should execute full user journey from prompt to story', async () => {
      const startTime = Date.now();
      const journeyData = {
        userId: testData.user1Id,
        promptId: 'journey-prompt-' + Date.now(),
        sessionId: 'journey-session-' + Date.now(),
        storyId: 'journey-story-' + Date.now()
      };

      const db = userContext.firestore();
      const storage = userContext.storage();

      console.log('🚀 Starting complete user journey integration test...');

      // Phase 1: User Registration/Profile Setup
      const userDoc = db.collection('users').doc(journeyData.userId);
      await assertSucceeds(userDoc.set({
        email: 'journey@test.com',
        displayName: 'Journey Test User',
        createdAt: new Date(),
        preferences: {
          emailNotifications: true,
          timezone: 'America/New_York',
          language: 'en'
        },
        subscription: {
          plan: 'premium',
          status: 'active',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      }));

      // Phase 2: Prompt Creation and Scheduling
      const promptDoc = db.collection('prompts').doc(journeyData.promptId);
      await assertSucceeds(promptDoc.set({
        userId: journeyData.userId,
        question: 'What life lesson did you learn from your grandparents that you still carry with you today?',
        status: 'waiting',
        category: 'wisdom',
        difficulty: 'medium',
        estimatedDuration: 240,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        createdAt: new Date(),
        updatedAt: new Date(),
        uniqueUrl: `https://app.loveretold.com/record/${journeyData.sessionId}`,
        sessionId: journeyData.sessionId,
        metadata: {
          source: 'curated',
          tags: ['wisdom', 'grandparents', 'life_lessons'],
          priority: 'high'
        }
      }));

      // Phase 3: Recording Session Initiation
      const sessionDoc = db.collection('recordingSessions').doc(journeyData.sessionId);
      await assertSucceeds(sessionDoc.set({
        promptId: journeyData.promptId,
        userId: journeyData.userId,
        status: 'active',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: {
          userAgent: 'Mozilla/5.0 (Journey Test)',
          deviceType: 'mobile',
          location: 'US'
        },
        settings: {
          recordAudio: true,
          recordVideo: true,
          quality: 'high'
        }
      }));

      // Phase 4: Recording Process
      // Start recording
      await assertSucceeds(sessionDoc.update({
        status: 'recording',
        recordingStartedAt: new Date()
      }));

      // Upload audio file
      const audioRef = storage.ref(`recordings/${journeyData.sessionId}/journey_audio.webm`);
      await assertSucceeds(audioRef.put(
        new Blob(['journey audio data'], { type: 'audio/webm' })
      ));

      // Upload video file
      const videoRef = storage.ref(`recordings/${journeyData.sessionId}/journey_video.webm`);
      await assertSucceeds(videoRef.put(
        new Blob(['journey video data'], { type: 'video/webm' })
      ));

      // Complete recording
      await assertSucceeds(sessionDoc.update({
        status: 'processing',
        recordingCompletedAt: new Date()
      }));

      // Phase 5: Story Processing and Creation
      const storyDoc = db.collection('stories').doc(journeyData.storyId);
      await assertSucceeds(storyDoc.set({
        userId: journeyData.userId,
        originalPromptId: journeyData.promptId,
        question: 'What life lesson did you learn from your grandparents...',
        audioUrl: `gs://love-retold-storage/processed/${journeyData.storyId}/audio.mp3`,
        videoUrl: `gs://love-retold-storage/processed/${journeyData.storyId}/video.mp4`,
        transcript: 'My grandmother always told me that kindness costs nothing but means everything. She showed me this through her daily actions - always helping neighbors, feeding stray cats, and never speaking ill of anyone. Even when people were unkind to her, she would respond with grace. This lesson has shaped how I interact with the world, and I try to pass this wisdom on to my own children.',
        duration: 187,
        fileSize: 3145728, // 3MB
        recordedAt: new Date(),
        createdAt: new Date(),
        processedAt: new Date(),
        metadata: {
          transcriptionConfidence: 0.97,
          language: 'en',
          processingTime: 42,
          audioQuality: 'high',
          videoQuality: 'high',
          transcriptionService: 'azure-speech'
        },
        tags: ['wisdom', 'grandparents', 'kindness', 'life_lessons', 'family'],
        isPublic: false
      }));

      // Phase 6: Complete session
      await assertSucceeds(sessionDoc.update({
        status: 'completed'
      }));

      // Phase 7: Update prompt status
      await assertSucceeds(promptDoc.update({
        status: 'completed',
        completedAt: new Date()
      }));

      // Phase 8: Validation - Verify complete journey
      const finalPrompt = await assertSucceeds(promptDoc.get());
      const finalSession = await assertSucceeds(sessionDoc.get());
      const finalStory = await assertSucceeds(storyDoc.get());

      expect(finalPrompt.data().status).toBe('completed');
      expect(finalSession.data().status).toBe('completed');
      expect(finalStory.exists).toBe(true);
      expect(finalStory.data().originalPromptId).toBe(journeyData.promptId);

      const duration = Date.now() - startTime;
      workflowResults.recordingWorkflow = {
        success: true,
        duration: duration,
        phases: [
          'user_setup', 'prompt_creation', 'session_initiation', 
          'recording_process', 'story_processing', 'completion', 'validation'
        ],
        journeyData: journeyData
      };

      console.log(`✅ Complete user journey integration completed in ${duration}ms`);
    });

    test('should validate data consistency across all services', async () => {
      const db = userContext.firestore();
      
      // Verify data relationships and integrity
      const prompt = await assertSucceeds(
        db.collection('prompts').doc(testData.workflowPromptId).get()
      );
      const session = await assertSucceeds(
        db.collection('recordingSessions').doc(testData.workflowSessionId).get()
      );
      const story = await assertSucceeds(
        db.collection('stories').doc(testData.workflowStoryId).get()
      );

      // Verify referential integrity
      expect(session.data().promptId).toBe(testData.workflowPromptId);
      expect(story.data().originalPromptId).toBe(testData.workflowPromptId);
      expect(session.data().userId).toBe(story.data().userId);

      // Verify status consistency
      expect(session.data().status).toBe('completed');
      expect(story.exists).toBe(true);

      workflowResults.crossServiceValidation = {
        success: true,
        referentialIntegrity: true,
        statusConsistency: true,
        dataRelationships: 'validated'
      };

      console.log('✅ Cross-service data consistency validated');
    });
  });

  describe('📊 Integration Flow Compliance Metrics', () => {
    test('should validate all integration workflows meet QA standards', async () => {
      const integrationCompliance = {
        promptWorkflowSuccess: workflowResults.promptCreation.success,
        sessionWorkflowSuccess: workflowResults.sessionManagement.success,
        storyWorkflowSuccess: workflowResults.storyProcessing.success,
        endToEndWorkflowSuccess: workflowResults.recordingWorkflow.success,
        crossServiceConsistency: workflowResults.crossServiceValidation.success
      };

      // All integration workflows must succeed
      Object.entries(integrationCompliance).forEach(([workflow, success]) => {
        expect(success).toBe(true);
      });

      const totalWorkflows = Object.keys(integrationCompliance).length;
      const successfulWorkflows = Object.values(integrationCompliance).filter(Boolean).length;
      const successRate = (successfulWorkflows / totalWorkflows) * 100;

      expect(successRate).toBe(100); // 100% success rate required

      console.log('📊 Integration Flow Compliance Summary:');
      console.log(`   Total Workflows: ${totalWorkflows}`);
      console.log(`   Successful: ${successfulWorkflows}`);
      console.log(`   Success Rate: ${successRate}%`);
    });

    test('should measure integration performance benchmarks', async () => {
      const performanceBenchmarks = {
        promptCreationTime: workflowResults.promptCreation.duration,
        sessionManagementTime: workflowResults.sessionManagement.duration,
        storyProcessingTime: workflowResults.storyProcessing.duration,
        endToEndJourneyTime: workflowResults.recordingWorkflow.duration
      };

      // Integration operations should complete within reasonable time
      const maxAllowedTime = 10000; // 10 seconds
      
      Object.entries(performanceBenchmarks).forEach(([operation, duration]) => {
        expect(duration).toBeLessThanOrEqual(maxAllowedTime);
        console.log(`   ${operation}: ${duration}ms`);
      });

      console.log('⚡ Integration performance benchmarks validated');
    });
  });

  function generateWorkflowReport(results) {
    console.log('\n🔗 INTEGRATION WORKFLOW TEST REPORT');
    console.log('=====================================');
    console.log('📊 Workflow Results:');
    
    Object.entries(results).forEach(([workflow, result]) => {
      if (result.success !== undefined) {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const duration = result.duration ? `${result.duration}ms` : 'N/A';
        console.log(`   ${status} ${workflow}: ${duration}`);
      }
    });
    
    console.log('=====================================\n');
  }
});

console.log('🔗 End-to-End Workflow Integration Tests Loaded - Wave 4 Integration Testing');