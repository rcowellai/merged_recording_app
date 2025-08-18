#!/usr/bin/env node

/**
 * Test Session Creation Script for Epic 3.1 Love Retold Integration Testing
 * 
 * This script documents the test sessions required for comprehensive Epic 3.1 testing
 * and provides a template for creating them in Firebase Console.
 * 
 * USAGE:
 * 1. Run this script to generate Firebase Console commands
 * 2. Execute the commands in Firebase Console manually
 * 3. Verify test sessions exist before running test suite
 */

console.log('=== Epic 3.1 Test Session Creation Guide ===\n');

// Test sessions required by love-retold-integration.test.js
const testSessions = {
  // Happy path - should have active status and valid question
  'epic31_happy_path_session': {
    status: 'active',
    userId: 'test-user-1',
    storytellerId: 'test-storyteller-1',
    promptId: 'test-prompt-1',
    question: 'Tell me about your favorite childhood memory',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    metadata: {
      testSession: true,
      purpose: 'Epic 3.1 Happy Path Testing'
    }
  },

  // Re-recording - should have completed status but allow re-recording
  'epic31_rerecord_session': {
    status: 'completed', 
    userId: 'test-user-2',
    storytellerId: 'test-storyteller-2',
    promptId: 'test-prompt-2',
    question: 'What was your first job like?',
    recordingUrl: 'https://storage.googleapis.com/test-recording.mp4',
    completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    metadata: {
      testSession: true,
      purpose: 'Epic 3.1 Re-recording Testing'
    }
  },

  // Network interruption - should have active status for network testing
  'epic31_network_session': {
    status: 'active',
    userId: 'test-user-3', 
    storytellerId: 'test-storyteller-3',
    promptId: 'test-prompt-3',
    question: 'Describe a place that holds special meaning for you',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    metadata: {
      testSession: true,
      purpose: 'Epic 3.1 Network Failure Testing'
    }
  },

  // Session expiry - should have expired status
  'epic31_expired_session': {
    status: 'expired',
    userId: 'test-user-4',
    storytellerId: 'test-storyteller-4', 
    promptId: 'test-prompt-4',
    question: 'What advice would you give to your younger self?',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (expired)
    metadata: {
      testSession: true,
      purpose: 'Epic 3.1 Session Expiry Testing'
    }
  },

  // Deleted prompts - session should not exist (will be handled by not creating it)
  'epic31_deleted_session': {
    // This session intentionally not created to simulate deleted/removed prompts
    // Will return functions/not-found error as expected
    status: 'INTENTIONALLY_NOT_CREATED',
    purpose: 'Simulates deleted prompt by not existing in Firebase'
  },

  // Multi-device - should have active status
  'epic31_multidevice_session': {
    status: 'active',
    userId: 'test-user-5',
    storytellerId: 'test-storyteller-5',
    promptId: 'test-prompt-5', 
    question: 'Tell me about a tradition in your family',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    metadata: {
      testSession: true,
      purpose: 'Epic 3.1 Multi-device Testing'
    }
  },

  // Large file - should have active status 
  'epic31_largefile_session': {
    status: 'active',
    userId: 'test-user-6',
    storytellerId: 'test-storyteller-6',
    promptId: 'test-prompt-6',
    question: 'Tell me the story of how you met your best friend',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    metadata: {
      testSession: true,
      purpose: 'Epic 3.1 Large File Testing'
    }
  },

  // Concurrent sessions - should have active status
  'epic31_concurrent_session': {
    status: 'active', 
    userId: 'test-user-7',
    storytellerId: 'test-storyteller-7',
    promptId: 'test-prompt-7',
    question: 'What is your proudest accomplishment?',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    metadata: {
      testSession: true,
      purpose: 'Epic 3.1 Concurrent User Testing'
    }
  }
};

console.log('📋 Required Test Sessions for Epic 3.1:\n');

// Generate Firebase Console commands
Object.entries(testSessions).forEach(([sessionId, sessionData]) => {
  if (sessionData.status === 'INTENTIONALLY_NOT_CREATED') {
    console.log(`❌ ${sessionId}: NOT CREATED (simulates deleted prompt)`);
    console.log(`   Purpose: ${sessionData.purpose}\n`);
    return;
  }

  console.log(`✅ ${sessionId}:`);
  console.log(`   Status: ${sessionData.status}`);  
  console.log(`   Question: "${sessionData.question}"`);
  console.log(`   Purpose: ${sessionData.metadata.purpose}`);
  console.log('   Firebase Console Command:');
  console.log(`   db.collection('recording-sessions').doc('${sessionId}').set(${JSON.stringify(sessionData, null, 2)})\n`);
});

console.log('🔧 Manual Creation Steps:\n');
console.log('1. Open Firebase Console: https://console.firebase.google.com');
console.log('2. Select your project (love-retold-dev or appropriate test project)');
console.log('3. Go to Firestore Database');
console.log('4. Navigate to "recording-sessions" collection (create if needed)');
console.log('5. For each session above:');
console.log('   a. Click "Add document"');
console.log('   b. Use the session ID as Document ID');
console.log('   c. Add the fields shown in the JSON structure');
console.log('   d. Set appropriate data types (string, timestamp, boolean, etc.)');
console.log('6. Verify all sessions exist before running tests\n');

console.log('🧪 Test Validation:\n');
console.log('Run this command to verify test data:');
console.log('cd tests/e2e && npx playwright test love-retold-integration.test.js\n');

console.log('📊 Expected Results After Test Data Creation:');
console.log('- Happy Path: Should show recording interface with question text');
console.log('- Session Expiry: Should show "expired" message');  
console.log('- Network Failure: Should handle network errors gracefully');
console.log('- Multi-device: Should show recording interface');
console.log('- Deleted Prompts: Should show "removed" message (session not created)');
console.log('- Performance: Should meet all timing requirements\n');

// Create automated validation script
console.log('💡 Automated Validation Script:\n');
console.log(`
const admin = require('firebase-admin');

// Initialize Firebase Admin (requires service account key)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'your-project-id'
});

const db = admin.firestore();

async function validateTestSessions() {
  const requiredSessions = [
    'epic31_happy_path_session',
    'epic31_rerecord_session', 
    'epic31_network_session',
    'epic31_expired_session',
    'epic31_multidevice_session',
    'epic31_largefile_session',
    'epic31_concurrent_session'
  ];
  
  console.log('🔍 Validating test sessions...');
  
  for (const sessionId of requiredSessions) {
    try {
      const doc = await db.collection('recording-sessions').doc(sessionId).get();
      if (doc.exists) {
        const data = doc.data();
        console.log(\`✅ \${sessionId}: \${data.status} - "\${data.question}"\`);
      } else {
        console.log(\`❌ \${sessionId}: NOT FOUND\`);
      }
    } catch (error) {
      console.log(\`❌ \${sessionId}: ERROR - \${error.message}\`);
    }
  }
  
  console.log('\\n🎯 Note: epic31_deleted_session should NOT exist (simulates deleted prompt)');
}

validateTestSessions();
`);

console.log('\n🎉 Test Data Creation Guide Complete!');
console.log('Save this script and follow the manual steps to create test sessions.');