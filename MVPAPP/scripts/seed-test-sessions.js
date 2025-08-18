/**
 * Seed Test Recording Sessions for Epic 1.5 Integration Testing
 * Creates various session states to test validation and error handling
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'love-retold-dev',
  });
}

const db = admin.firestore();

// Test user ID
const TEST_USER_ID = 'epic15_test_user';

/**
 * Create test recording sessions with different states
 */
async function seedTestSessions() {
  console.log('🌱 Seeding test recording sessions for Epic 1.5...');

  const now = admin.firestore.Timestamp.now();
  const futureDate = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  );
  const pastDate = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
  );

  const testSessions = [
    {
      id: 'epic15_active_session_1',
      userId: TEST_USER_ID,
      questionText: 'Tell me about your favorite childhood memory.',
      status: 'active',
      createdAt: now,
      expiresAt: futureDate,
      updatedAt: now,
      metadata: {
        testSession: true,
        epic: '1.5',
        expectedResult: 'valid',
      }
    },
    {
      id: 'epic15_active_session_2',
      userId: TEST_USER_ID,
      questionText: 'What advice would you give to your younger self?',
      status: 'active',
      createdAt: now,
      expiresAt: futureDate,
      updatedAt: now,
      metadata: {
        testSession: true,
        epic: '1.5',
        expectedResult: 'valid',
      }
    },
    {
      id: 'epic15_expired_session',
      userId: TEST_USER_ID,
      questionText: 'This session has expired.',
      status: 'active',
      createdAt: pastDate,
      expiresAt: pastDate,
      updatedAt: pastDate,
      metadata: {
        testSession: true,
        epic: '1.5',
        expectedResult: 'expired',
      }
    },
    {
      id: 'epic15_completed_session',
      userId: TEST_USER_ID,
      questionText: 'This recording has already been completed.',
      status: 'completed',
      createdAt: now,
      expiresAt: futureDate,
      completedAt: now,
      updatedAt: now,
      storyId: 'story_epic15_completed_session_test',
      metadata: {
        testSession: true,
        epic: '1.5',
        expectedResult: 'completed',
      }
    },
    {
      id: 'epic15_removed_session',
      userId: TEST_USER_ID,
      questionText: 'This session has been removed.',
      status: 'removed',
      createdAt: now,
      expiresAt: futureDate,
      updatedAt: now,
      metadata: {
        testSession: true,
        epic: '1.5',
        expectedResult: 'removed',
      }
    }
  ];

  console.log(`📝 Creating ${testSessions.length} test sessions...`);

  for (const session of testSessions) {
    try {
      await db.collection('recordingSessions').doc(session.id).set(session);
      console.log(`✅ Created session: ${session.id} (${session.metadata.expectedResult})`);
    } catch (error) {
      console.error(`❌ Error creating session ${session.id}:`, error);
    }
  }

  // Create a test story for the completed session
  const testStory = {
    id: 'story_epic15_completed_session_test',
    sessionId: 'epic15_completed_session',
    userId: TEST_USER_ID,
    questionText: 'This recording has already been completed.',
    transcript: 'This is a test transcript for Epic 1.5 integration testing.',
    recordingUrl: null,
    recordingType: 'audio',
    metadata: {
      testStory: true,
      epic: '1.5',
      createdAt: now,
    },
    status: 'completed',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.collection('stories').doc(testStory.id).set(testStory);
    console.log(`✅ Created test story: ${testStory.id}`);
  } catch (error) {
    console.error(`❌ Error creating test story:`, error);
  }

  console.log('\n🎯 Test Sessions Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  testSessions.forEach(session => {
    const url = `https://love-retold-dev.web.app/record/${session.id}`;
    console.log(`📎 ${session.metadata.expectedResult.toUpperCase().padEnd(10)} | ${session.id}`);
    console.log(`   ${url}`);
    console.log(`   Question: ${session.questionText}`);
    console.log('');
  });

  console.log('🚀 Test sessions created successfully!');
  console.log('Use these URLs to test the recording app validation.');
  
  return testSessions;
}

/**
 * Clean up test data
 */
async function cleanupTestSessions() {
  console.log('🧹 Cleaning up test sessions...');

  const sessionsSnapshot = await db.collection('recordingSessions')
    .where('metadata.testSession', '==', true)
    .get();

  const storiesSnapshot = await db.collection('stories')
    .where('metadata.testStory', '==', true)
    .get();

  const batch = db.batch();

  sessionsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  storiesSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`✅ Cleaned up ${sessionsSnapshot.size} sessions and ${storiesSnapshot.size} stories`);
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'clean') {
    cleanupTestSessions()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Error cleaning up test data:', error);
        process.exit(1);
      });
  } else {
    seedTestSessions()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Error seeding test data:', error);
        process.exit(1);
      });
  }
}

module.exports = { seedTestSessions, cleanupTestSessions };