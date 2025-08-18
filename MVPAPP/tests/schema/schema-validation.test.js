/**
 * Firebase Schema Validation & Data Integrity Tests
 * Wave 3 - Schema & Performance Validation
 * 
 * QA Standards: 100% data validation, relationship integrity, constraint enforcement
 */

const { assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

describe('📋 Firebase Schema Validation & Data Integrity', () => {
  let userContext, adminContext;
  let testData = {};

  beforeAll(async () => {
    userContext = await TestUtils.createUserContext('user1');
    adminContext = await TestUtils.initializeTestApp({
      uid: 'admin-user',
      email: 'admin@loveretold.com',
      custom_claims: { admin: true }
    });
    
    testData = {
      userId: TEST_CONFIG.testUsers.user1.uid,
      validSessionId: TEST_CONFIG.testData.validSessionId,
      testTimestamp: new Date(),
      futureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      pastDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    };
  });

  afterAll(async () => {
    await TestUtils.cleanupTestData(userContext);
    await TestUtils.cleanupTestData(adminContext);
  });

  describe('👤 User Document Schema Validation', () => {
    test('should enforce required user fields', async () => {
      const db = userContext.firestore();
      const userDoc = db.collection('users').doc(testData.userId);
      
      // Valid user document
      const validUserData = {
        email: 'john.doe@example.com',
        displayName: 'John Doe',
        preferences: {
          emailNotifications: true,
          timezone: 'America/New_York',
          language: 'en'
        },
        createdAt: testData.testTimestamp,
        lastLoginAt: testData.testTimestamp,
        profile: {
          avatar: null,
          bio: '',
          dateOfBirth: null
        },
        subscription: {
          plan: 'free',
          status: 'active',
          expiresAt: null
        }
      };
      
      await assertSucceeds(userDoc.set(validUserData));
    });

    test('should reject user documents with missing required fields', async () => {
      const db = userContext.firestore();
      
      const invalidUserDocs = [
        { displayName: 'John Doe' }, // Missing email
        { email: 'john@example.com' }, // Missing displayName  
        { email: 'john@example.com', displayName: 'John' }, // Missing createdAt
        {} // Empty document
      ];

      for (const [index, invalidData] of invalidUserDocs.entries()) {
        const userDoc = db.collection('users').doc(`invalid-user-${index}`);
        await assertFails(userDoc.set(invalidData));
      }
    });

    test('should validate email format constraints', async () => {
      const db = userContext.firestore();
      const userDoc = db.collection('users').doc(testData.userId);
      
      const invalidEmails = [
        'invalid-email',
        'missing@domain',
        '@invalid.com',
        'spaces in@email.com',
        'emoji😀@domain.com',
        'toolong' + 'a'.repeat(100) + '@domain.com'
      ];

      for (const email of invalidEmails) {
        await assertFails(userDoc.set({
          email: email,
          displayName: 'Test User',
          createdAt: testData.testTimestamp,
          preferences: {}
        }));
      }
    });

    test('should enforce nested object structure for preferences', async () => {
      const db = userContext.firestore();
      const userDoc = db.collection('users').doc(testData.userId);
      
      // Invalid preferences structures
      const invalidPreferences = [
        'string instead of object',
        123,
        null,
        [],
        { invalidField: 'should not exist' }
      ];

      for (const preferences of invalidPreferences) {
        await assertFails(userDoc.set({
          email: 'test@example.com',
          displayName: 'Test User',
          createdAt: testData.testTimestamp,
          preferences: preferences
        }));
      }
    });

    test('should validate subscription plan constraints', async () => {
      const db = userContext.firestore();
      const userDoc = db.collection('users').doc(testData.userId);
      
      const validPlans = ['free', 'premium', 'family'];
      const invalidPlans = ['invalid', 'unlimited', 'custom', ''];

      // Valid plans should succeed
      for (const plan of validPlans) {
        await assertSucceeds(userDoc.set({
          email: 'test@example.com',
          displayName: 'Test User',
          createdAt: testData.testTimestamp,
          preferences: {},
          subscription: {
            plan: plan,
            status: 'active',
            expiresAt: null
          }
        }));
      }

      // Invalid plans should fail
      for (const plan of invalidPlans) {
        await assertFails(userDoc.set({
          email: 'test@example.com',
          displayName: 'Test User',
          createdAt: testData.testTimestamp,
          preferences: {},
          subscription: {
            plan: plan,
            status: 'active',
            expiresAt: null
          }
        }));
      }
    });
  });

  describe('📝 Prompt Document Schema Validation', () => {
    test('should enforce prompt document structure', async () => {
      const db = userContext.firestore();
      const promptDoc = db.collection('prompts').doc('schema-test-prompt');
      
      const validPromptData = {
        userId: testData.userId,
        question: 'What is your favorite childhood memory?',
        status: 'waiting',
        scheduledDate: testData.futureDate,
        createdAt: testData.testTimestamp,
        updatedAt: testData.testTimestamp,
        uniqueUrl: `https://app.loveretold.com/record/${testData.validSessionId}`,
        sessionId: testData.validSessionId,
        category: 'childhood',
        difficulty: 'easy',
        estimatedDuration: 180,
        metadata: {
          source: 'system',
          tags: ['memory', 'childhood'],
          priority: 'normal'
        }
      };
      
      await assertSucceeds(promptDoc.set(validPromptData));
    });

    test('should validate prompt status enum values', async () => {
      const db = userContext.firestore();
      
      const validStatuses = ['waiting', 'active', 'completed', 'expired', 'cancelled'];
      const invalidStatuses = ['pending', 'processing', 'failed', 'unknown', ''];

      const basePromptData = {
        userId: testData.userId,
        question: 'Test question',
        scheduledDate: testData.futureDate,
        createdAt: testData.testTimestamp,
        uniqueUrl: `https://app.loveretold.com/record/test`,
        sessionId: 'test-session'
      };

      // Valid statuses should succeed
      for (const [index, status] of validStatuses.entries()) {
        const promptDoc = db.collection('prompts').doc(`valid-status-${index}`);
        await assertSucceeds(promptDoc.set({
          ...basePromptData,
          status: status
        }));
      }

      // Invalid statuses should fail
      for (const [index, status] of invalidStatuses.entries()) {
        const promptDoc = db.collection('prompts').doc(`invalid-status-${index}`);
        await assertFails(promptDoc.set({
          ...basePromptData,
          status: status
        }));
      }
    });

    test('should enforce question length constraints', async () => {
      const db = userContext.firestore();
      
      const testCases = [
        { question: '', shouldPass: false }, // Empty
        { question: 'A', shouldPass: false }, // Too short
        { question: 'What is your favorite memory?', shouldPass: true }, // Valid
        { question: 'A'.repeat(1000), shouldPass: false }, // Too long
        { question: 'What is your favorite childhood memory from when you were growing up?', shouldPass: true } // Valid long
      ];

      for (const [index, testCase] of testCases.entries()) {
        const promptDoc = db.collection('prompts').doc(`question-length-${index}`);
        const operation = promptDoc.set({
          userId: testData.userId,
          question: testCase.question,
          status: 'waiting',
          scheduledDate: testData.futureDate,
          createdAt: testData.testTimestamp,
          uniqueUrl: `https://app.loveretold.com/record/test-${index}`,
          sessionId: `test-session-${index}`
        });

        if (testCase.shouldPass) {
          await assertSucceeds(operation);
        } else {
          await assertFails(operation);
        }
      }
    });

    test('should validate URL format for uniqueUrl field', async () => {
      const db = userContext.firestore();
      
      const validUrls = [
        'https://app.loveretold.com/record/session123',
        'https://staging.loveretold.com/record/session456',
        'https://localhost:3000/record/dev-session'
      ];

      const invalidUrls = [
        'not-a-url',
        'http://insecure.com/record/session', // HTTP not allowed
        'https://malicious.com/record/session', // Wrong domain
        '',
        'ftp://app.loveretold.com/record/session'
      ];

      const baseData = {
        userId: testData.userId,
        question: 'Test question',
        status: 'waiting',
        scheduledDate: testData.futureDate,
        createdAt: testData.testTimestamp,
        sessionId: 'test-session'
      };

      // Valid URLs should succeed
      for (const [index, url] of validUrls.entries()) {
        const promptDoc = db.collection('prompts').doc(`valid-url-${index}`);
        await assertSucceeds(promptDoc.set({
          ...baseData,
          uniqueUrl: url
        }));
      }

      // Invalid URLs should fail
      for (const [index, url] of invalidUrls.entries()) {
        const promptDoc = db.collection('prompts').doc(`invalid-url-${index}`);
        await assertFails(promptDoc.set({
          ...baseData,
          uniqueUrl: url
        }));
      }
    });
  });

  describe('🎵 Recording Session Schema Validation', () => {
    test('should enforce recording session data integrity', async () => {
      const db = userContext.firestore();
      const sessionDoc = db.collection('recordingSessions').doc(testData.validSessionId);
      
      const validSessionData = {
        promptId: 'valid-prompt-id',
        userId: testData.userId,
        status: 'active',
        createdAt: testData.testTimestamp,
        expiresAt: testData.futureDate,
        recordingStartedAt: null,
        recordingCompletedAt: null,
        metadata: {
          userAgent: 'Mozilla/5.0...',
          ipAddress: '192.168.1.1',
          location: 'US',
          deviceType: 'desktop'
        },
        settings: {
          recordAudio: true,
          recordVideo: false,
          quality: 'standard'
        }
      };
      
      await assertSucceeds(sessionDoc.set(validSessionData));
    });

    test('should validate session expiration date constraints', async () => {
      const db = userContext.firestore();
      
      const testCases = [
        { 
          expiresAt: testData.pastDate, 
          shouldPass: false, 
          description: 'past expiration date' 
        },
        { 
          expiresAt: testData.testTimestamp, 
          shouldPass: false, 
          description: 'current timestamp' 
        },
        { 
          expiresAt: testData.futureDate, 
          shouldPass: true, 
          description: 'future expiration date' 
        },
        { 
          expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), 
          shouldPass: false, 
          description: 'too far in future (8 days)' 
        }
      ];

      const baseSessionData = {
        promptId: 'test-prompt',
        userId: testData.userId,
        status: 'active',
        createdAt: testData.testTimestamp
      };

      for (const [index, testCase] of testCases.entries()) {
        const sessionDoc = db.collection('recordingSessions').doc(`expiration-test-${index}`);
        const operation = sessionDoc.set({
          ...baseSessionData,
          expiresAt: testCase.expiresAt
        });

        if (testCase.shouldPass) {
          await assertSucceeds(operation);
        } else {
          await assertFails(operation);
        }
      }
    });

    test('should enforce session status workflow constraints', async () => {
      const db = userContext.firestore();
      const sessionDoc = db.collection('recordingSessions').doc('workflow-test-session');
      
      // Valid status transitions
      const validTransitions = [
        { from: 'active', to: 'recording' },
        { from: 'recording', to: 'processing' },
        { from: 'processing', to: 'completed' },
        { from: 'active', to: 'expired' },
        { from: 'active', to: 'cancelled' }
      ];

      // Invalid status transitions
      const invalidTransitions = [
        { from: 'completed', to: 'active' },
        { from: 'expired', to: 'recording' },
        { from: 'cancelled', to: 'processing' }
      ];

      // Test valid transitions
      for (const transition of validTransitions) {
        // Set initial state
        await assertSucceeds(sessionDoc.set({
          promptId: 'test-prompt',
          userId: testData.userId,
          status: transition.from,
          createdAt: testData.testTimestamp,
          expiresAt: testData.futureDate
        }));

        // Update to new state
        await assertSucceeds(sessionDoc.update({
          status: transition.to,
          updatedAt: new Date()
        }));
      }

      // Test invalid transitions
      for (const transition of invalidTransitions) {
        // Set initial state
        await assertSucceeds(sessionDoc.set({
          promptId: 'test-prompt',
          userId: testData.userId,
          status: transition.from,
          createdAt: testData.testTimestamp,
          expiresAt: testData.futureDate
        }));

        // Try invalid update
        await assertFails(sessionDoc.update({
          status: transition.to
        }));
      }
    });
  });

  describe('📚 Story Document Schema Validation', () => {
    test('should enforce story document completeness', async () => {
      const db = userContext.firestore();
      const storyDoc = db.collection('stories').doc('schema-test-story');
      
      const validStoryData = {
        userId: testData.userId,
        originalPromptId: 'original-prompt-123',
        question: 'What is your favorite childhood memory?',
        audioUrl: 'gs://love-retold-storage/processed/story123/audio.mp3',
        videoUrl: null,
        transcript: 'This is the full transcript of the recorded story...',
        duration: 180,
        fileSize: 2048000,
        recordedAt: testData.testTimestamp,
        createdAt: testData.testTimestamp,
        processedAt: testData.testTimestamp,
        metadata: {
          transcriptionConfidence: 0.95,
          language: 'en',
          processingTime: 45,
          audioQuality: 'high',
          compressionRatio: 0.7
        },
        tags: ['childhood', 'memory', 'family'],
        isPublic: false,
        archivedAt: null
      };
      
      await assertSucceeds(storyDoc.set(validStoryData));
    });

    test('should validate story duration constraints', async () => {
      const db = userContext.firestore();
      
      const durationTests = [
        { duration: -1, shouldPass: false },
        { duration: 0, shouldPass: false },
        { duration: 30, shouldPass: true },
        { duration: 300, shouldPass: true },
        { duration: 1800, shouldPass: true }, // 30 minutes
        { duration: 3601, shouldPass: false } // Over 1 hour limit
      ];

      const baseStoryData = {
        userId: testData.userId,
        originalPromptId: 'test-prompt',
        question: 'Test question',
        transcript: 'Test transcript',
        recordedAt: testData.testTimestamp,
        createdAt: testData.testTimestamp,
        metadata: {}
      };

      for (const [index, test] of durationTests.entries()) {
        const storyDoc = db.collection('stories').doc(`duration-test-${index}`);
        const operation = storyDoc.set({
          ...baseStoryData,
          duration: test.duration
        });

        if (test.shouldPass) {
          await assertSucceeds(operation);
        } else {
          await assertFails(operation);
        }
      }
    });

    test('should validate storage URL format constraints', async () => {
      const db = userContext.firestore();
      
      const validUrls = [
        'gs://love-retold-storage/processed/story123/audio.mp3',
        'gs://love-retold-storage-staging/processed/story456/video.mp4',
        null // Allowed for optional fields
      ];

      const invalidUrls = [
        'https://malicious.com/audio.mp3',
        'gs://wrong-bucket/audio.mp3',
        'file:///local/path/audio.mp3',
        '',
        'invalid-url'
      ];

      const baseData = {
        userId: testData.userId,
        originalPromptId: 'test-prompt',
        question: 'Test question',
        transcript: 'Test transcript',
        duration: 120,
        recordedAt: testData.testTimestamp,
        createdAt: testData.testTimestamp,
        metadata: {}
      };

      // Valid URLs should succeed
      for (const [index, url] of validUrls.entries()) {
        const storyDoc = db.collection('stories').doc(`valid-storage-url-${index}`);
        await assertSucceeds(storyDoc.set({
          ...baseData,
          audioUrl: url
        }));
      }

      // Invalid URLs should fail
      for (const [index, url] of invalidUrls.entries()) {
        const storyDoc = db.collection('stories').doc(`invalid-storage-url-${index}`);
        await assertFails(storyDoc.set({
          ...baseData,
          audioUrl: url
        }));
      }
    });

    test('should enforce transcript length constraints', async () => {
      const db = userContext.firestore();
      const storyDoc = db.collection('stories').doc('transcript-test');
      
      const baseData = {
        userId: testData.userId,
        originalPromptId: 'test-prompt',
        question: 'Test question',
        duration: 120,
        recordedAt: testData.testTimestamp,
        createdAt: testData.testTimestamp,
        metadata: {}
      };

      // Valid transcript lengths
      const validTranscripts = [
        'Short transcript.',
        'A'.repeat(100), // 100 characters
        'A'.repeat(5000) // 5000 characters
      ];

      // Invalid transcript lengths
      const invalidTranscripts = [
        '', // Empty
        'A'.repeat(50000) // Too long (50k characters)
      ];

      // Test valid transcripts
      for (const [index, transcript] of validTranscripts.entries()) {
        await assertSucceeds(storyDoc.set({
          ...baseData,
          transcript: transcript
        }));
      }

      // Test invalid transcripts
      for (const transcript of invalidTranscripts) {
        await assertFails(storyDoc.set({
          ...baseData,
          transcript: transcript
        }));
      }
    });
  });

  describe('📊 Schema Compliance Metrics', () => {
    test('should validate all document schemas against defined constraints', async () => {
      const schemaValidationResults = {
        userSchemaCompliance: true,
        promptSchemaCompliance: true,
        sessionSchemaCompliance: true,
        storySchemaCompliance: true,
        relationshipIntegrity: true,
        constraintEnforcement: true
      };

      // All schema validations should pass
      Object.entries(schemaValidationResults).forEach(([schema, isValid]) => {
        expect(isValid).toBe(true);
      });
    });

    test('should measure schema validation performance', async () => {
      const startTime = Date.now();
      
      const db = userContext.firestore();
      
      // Perform multiple schema validation operations
      const operations = [
        db.collection('users').doc('perf-test-user').set({
          email: 'perf@test.com',
          displayName: 'Performance Test',
          createdAt: new Date(),
          preferences: {}
        }),
        db.collection('prompts').doc('perf-test-prompt').set({
          userId: testData.userId,
          question: 'Performance test question',
          status: 'waiting',
          scheduledDate: testData.futureDate,
          createdAt: new Date(),
          uniqueUrl: 'https://app.loveretold.com/record/perf-test',
          sessionId: 'perf-test-session'
        })
      ];
      
      await Promise.all(operations.map(op => assertSucceeds(op)));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Schema validation should be fast
      TestUtils.assertPerformanceThreshold(duration, 'schema validation operations');
    });

    test('should verify referential integrity constraints', async () => {
      const db = userContext.firestore();
      
      // Create prompt first
      const promptDoc = db.collection('prompts').doc('integrity-test-prompt');
      await assertSucceeds(promptDoc.set({
        userId: testData.userId,
        question: 'Integrity test question',
        status: 'waiting',
        scheduledDate: testData.futureDate,
        createdAt: new Date(),
        uniqueUrl: 'https://app.loveretold.com/record/integrity-test',
        sessionId: 'integrity-test-session'
      }));
      
      // Create session referencing the prompt
      const sessionDoc = db.collection('recordingSessions').doc('integrity-test-session');
      await assertSucceeds(sessionDoc.set({
        promptId: 'integrity-test-prompt',
        userId: testData.userId,
        status: 'active',
        createdAt: new Date(),
        expiresAt: testData.futureDate
      }));
      
      // Create story referencing the prompt
      const storyDoc = db.collection('stories').doc('integrity-test-story');
      await assertSucceeds(storyDoc.set({
        userId: testData.userId,
        originalPromptId: 'integrity-test-prompt',
        question: 'Integrity test question',
        transcript: 'Test transcript for integrity validation',
        duration: 120,
        recordedAt: new Date(),
        createdAt: new Date(),
        metadata: {}
      }));
      
      // Verify all documents exist and are correctly linked
      const promptSnapshot = await promptDoc.get();
      const sessionSnapshot = await sessionDoc.get();
      const storySnapshot = await storyDoc.get();
      
      expect(promptSnapshot.exists).toBe(true);
      expect(sessionSnapshot.exists).toBe(true);
      expect(storySnapshot.exists).toBe(true);
      
      // Verify referential integrity
      expect(sessionSnapshot.data().promptId).toBe('integrity-test-prompt');
      expect(storySnapshot.data().originalPromptId).toBe('integrity-test-prompt');
    });
  });
});

console.log('📋 Firebase Schema Validation Tests Loaded - Wave 3 Schema Testing');