/**
 * Database Seeding Script for Love Retold Recording Integration
 * Creates sample data for development and testing
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin SDK
const app = initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'love-retold-backend-dev'
});

const db = getFirestore(app);
const auth = getAuth(app);

/**
 * Sample data for seeding
 */
const SAMPLE_USERS = [
  {
    uid: 'test-user-1',
    email: 'john.doe@example.com',
    displayName: 'John Doe',
    userData: {
      preferences: {
        emailNotifications: true,
        timezone: 'America/New_York'
      },
      createdAt: Timestamp.now(),
      lastActive: Timestamp.now()
    }
  },
  {
    uid: 'test-user-2',
    email: 'jane.smith@example.com',
    displayName: 'Jane Smith',
    userData: {
      preferences: {
        emailNotifications: true,
        timezone: 'America/Los_Angeles'
      },
      createdAt: Timestamp.now(),
      lastActive: Timestamp.now()
    }
  }
];

const SAMPLE_PROMPTS = [
  {
    userId: 'test-user-1',
    question: 'Tell me about your childhood home. What did it look like and what are your favorite memories there?',
    status: 'waiting',
    scheduledDate: new Date('2024-01-15'),
    createdAt: Timestamp.now()
  },
  {
    userId: 'test-user-1',
    question: 'Describe your first day of school. How did you feel and what do you remember most?',
    status: 'sent',
    scheduledDate: new Date('2024-01-10'),
    createdAt: Timestamp.now(),
    sentAt: Timestamp.now()
  },
  {
    userId: 'test-user-2',
    question: 'What was your favorite family tradition growing up? How did it make you feel?',
    status: 'waiting',
    scheduledDate: new Date('2024-01-20'),
    createdAt: Timestamp.now()
  }
];

const SAMPLE_STORIES = [
  {
    userId: 'test-user-1',
    originalPromptId: 'will-be-set-dynamically',
    question: 'Tell me about your wedding day. What are the moments you remember most vividly?',
    audioUrl: 'gs://love-retold-backend-dev.appspot.com/sample/sample-audio.wav',
    videoUrl: null,
    transcript: 'Our wedding day was absolutely magical. I remember waking up that morning feeling a mix of excitement and nervousness. The venue looked stunning with all the flowers we had chosen...',
    duration: 180,
    recordedAt: Timestamp.fromDate(new Date('2024-01-05')),
    createdAt: Timestamp.fromDate(new Date('2024-01-05')),
    metadata: {
      transcriptionConfidence: 0.95,
      fileSize: 2048000,
      processingTime: 15
    }
  },
  {
    userId: 'test-user-2',
    originalPromptId: 'will-be-set-dynamically',
    question: 'What was your proudest achievement as a parent?',
    audioUrl: 'gs://love-retold-backend-dev.appspot.com/sample/sample-audio-2.wav',
    videoUrl: 'gs://love-retold-backend-dev.appspot.com/sample/sample-video.webm',
    transcript: 'I think my proudest moment as a parent was when my daughter graduated from college. Seeing her walk across that stage, knowing all the challenges she had overcome...',
    duration: 240,
    recordedAt: Timestamp.fromDate(new Date('2024-01-08')),
    createdAt: Timestamp.fromDate(new Date('2024-01-08')),
    metadata: {
      transcriptionConfidence: 0.92,
      fileSize: 5120000,
      processingTime: 28
    }
  }
];

/**
 * Helper function to generate unique session ID
 */
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper function to generate unique URL
 */
function generateUniqueUrl(sessionId) {
  const baseUrl = process.env.RECORDING_APP_URL || 'http://localhost:5173';
  return `${baseUrl}/record/${sessionId}`;
}

/**
 * Create test users in Firebase Auth
 */
async function createTestUsers() {
  console.log('Creating test users...');
  
  for (const userData of SAMPLE_USERS) {
    try {
      // Create user in Firebase Auth
      await auth.createUser({
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        password: 'testpassword123',
        emailVerified: true
      });
      
      // Create user document in Firestore
      await db.collection('users').doc(userData.uid).set({
        email: userData.email,
        ...userData.userData
      });
      
      console.log(`✓ Created user: ${userData.email}`);
    } catch (error) {
      if (error.code === 'auth/uid-already-exists') {
        console.log(`- User already exists: ${userData.email}`);
      } else {
        console.error(`Error creating user ${userData.email}:`, error);
      }
    }
  }
}

/**
 * Create sample prompts and recording sessions
 */
async function createSamplePrompts() {
  console.log('Creating sample prompts and recording sessions...');
  
  const promptIds = [];
  
  for (const promptData of SAMPLE_PROMPTS) {
    const sessionId = generateSessionId();
    const uniqueUrl = generateUniqueUrl(sessionId);
    
    // Create prompt document
    const promptRef = db.collection('prompts').doc();
    await promptRef.set({
      ...promptData,
      uniqueUrl,
      sessionId
    });
    
    promptIds.push(promptRef.id);
    
    // Create corresponding recording session
    await db.collection('recordingSessions').doc(sessionId).set({
      promptId: promptRef.id,
      userId: promptData.userId,
      status: 'active',
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days
    });
    
    console.log(`✓ Created prompt and session: ${promptData.question.substring(0, 50)}...`);
  }
  
  return promptIds;
}

/**
 * Create sample stories
 */
async function createSampleStories(promptIds) {
  console.log('Creating sample stories...');
  
  for (let i = 0; i < SAMPLE_STORIES.length && i < promptIds.length; i++) {
    const storyData = {
      ...SAMPLE_STORIES[i],
      originalPromptId: promptIds[i]
    };
    
    const storyRef = db.collection('stories').doc();
    await storyRef.set(storyData);
    
    console.log(`✓ Created story: ${storyData.question.substring(0, 50)}...`);
  }
}

/**
 * Create analytics sample data
 */
async function createAnalyticsData() {
  console.log('Creating sample analytics data...');
  
  const analyticsData = [
    {
      eventType: 'recording_completed',
      userId: 'test-user-1',
      timestamp: Timestamp.now(),
      data: {
        duration: 180,
        format: 'audio',
        transcriptionConfidence: 0.95
      }
    },
    {
      eventType: 'story_viewed',
      userId: 'test-user-1',
      timestamp: Timestamp.now(),
      data: {
        storyId: 'sample-story-1',
        viewDuration: 60
      }
    }
  ];
  
  for (const event of analyticsData) {
    await db.collection('analytics').add(event);
  }
  
  console.log('✓ Created sample analytics data');
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    console.log(`📊 Project: ${app.options.projectId}`);
    
    // Create test users
    await createTestUsers();
    
    // Create sample prompts and sessions
    const promptIds = await createSamplePrompts();
    
    // Create sample stories
    await createSampleStories(promptIds);
    
    // Create analytics data
    await createAnalyticsData();
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Users: ${SAMPLE_USERS.length}`);
    console.log(`   Prompts: ${SAMPLE_PROMPTS.length}`);
    console.log(`   Stories: ${SAMPLE_STORIES.length}`);
    console.log('   Analytics: Sample events created');
    
    console.log('\n🔐 Test Credentials:');
    console.log('   Email: john.doe@example.com');
    console.log('   Email: jane.smith@example.com');
    console.log('   Password: testpassword123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

/**
 * Run if called directly
 */
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  seedDatabase,
  createTestUsers,
  createSamplePrompts,
  createSampleStories
};