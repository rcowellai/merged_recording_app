/**
 * Storyteller Name Debugging Script
 * =================================
 * Helps diagnose why storytellerName is showing as "Unknown"
 * 
 * Usage: node debug-storyteller-name.js <sessionId>
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (you may need to adjust the path to your service account key)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'love-retold-webapp'
  });
}

const db = admin.firestore();

async function debugStorytellerName(sessionId) {
  console.log(`🔍 Debugging storytellerName for session: ${sessionId}`);
  console.log('=' .repeat(60));
  
  try {
    // 1. Get the recording session document
    console.log('\n📄 Step 1: Fetching recording session...');
    const sessionDoc = await db.collection('recordingSessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      console.error('❌ Session document not found!');
      return;
    }
    
    const sessionData = sessionDoc.data();
    console.log('✅ Session document found');
    
    // 2. Inspect session data
    console.log('\n📊 Step 2: Session data analysis...');
    console.log(`   sessionId: ${sessionData.sessionId || 'NOT_SET'}`);
    console.log(`   userId: ${sessionData.userId || 'NOT_SET'}`);
    console.log(`   storytellerId: ${sessionData.storytellerId || 'NOT_SET'}`);
    console.log(`   storytellerName: "${sessionData.storytellerName || 'NOT_SET'}"`);
    console.log(`   promptText: "${sessionData.promptText ? sessionData.promptText.substring(0, 50) + '...' : 'NOT_SET'}"`);
    console.log(`   status: ${sessionData.status || 'NOT_SET'}`);
    console.log(`   createdAt: ${sessionData.createdAt ? sessionData.createdAt.toDate() : 'NOT_SET'}`);
    
    // 3. Check storytellerName field specifically
    console.log('\n🎭 Step 3: StorytellerName field analysis...');
    const storytellerName = sessionData.storytellerName;
    console.log(`   Type: ${typeof storytellerName}`);
    console.log(`   Value: "${storytellerName}"`);
    console.log(`   Length: ${storytellerName ? storytellerName.length : 'N/A'}`);
    console.log(`   Truthy: ${!!storytellerName}`);
    console.log(`   Is "Unknown": ${storytellerName === 'Unknown'}`);
    console.log(`   Is empty string: ${storytellerName === ''}`);
    console.log(`   Is null: ${storytellerName === null}`);
    console.log(`   Is undefined: ${storytellerName === undefined}`);
    
    // 4. If storytellerId exists, check the storyteller document
    if (sessionData.storytellerId) {
      console.log('\n👤 Step 4: Checking storyteller document...');
      
      const storytellerDoc = await db.collection('storytellers').doc(sessionData.storytellerId).get();
      
      if (storytellerDoc.exists) {
        const storytellerData = storytellerDoc.data();
        console.log('✅ Storyteller document found');
        console.log(`   firstName: "${storytellerData.firstName || 'NOT_SET'}"`);
        console.log(`   lastName: "${storytellerData.lastName || 'NOT_SET'}"`);
        console.log(`   userId: ${storytellerData.userId || 'NOT_SET'}`);
        console.log(`   userId matches session: ${storytellerData.userId === sessionData.userId}`);
      } else {
        console.error('❌ Storyteller document not found!');
        console.log(`   Looked for document ID: ${sessionData.storytellerId}`);
      }
    } else {
      console.warn('⚠️ No storytellerId in session document');
    }
    
    // 5. Diagnosis
    console.log('\n🔬 Step 5: Diagnosis...');
    
    if (!storytellerName) {
      console.log('❌ Issue: storytellerName is missing from session document');
      console.log('   → This is likely a legacy session created before Love Retold\'s fix');
      console.log('   → Solution: Test with a newly created session');
    } else if (storytellerName === 'Unknown') {
      console.log('❌ Issue: storytellerName was explicitly set to "Unknown"');
      console.log('   → This indicates the getStorytellerFirstName() function failed');
      console.log('   → Check that the storyteller document exists and has firstName field');
    } else {
      console.log('✅ storytellerName looks correct');
      console.log('   → The issue might be in frontend rendering');
    }
    
  } catch (error) {
    console.error('💥 Error during debugging:', error);
  }
}

// Parse command line arguments
const sessionId = process.argv[2];

if (!sessionId) {
  console.error('❌ Please provide a sessionId');
  console.log('Usage: node debug-storyteller-name.js <sessionId>');
  console.log('Example: node debug-storyteller-name.js j4e19zc-firstspa-myCtZuIW-myCtZuIW-1755603545');
  process.exit(1);
}

// Run the debugging
debugStorytellerName(sessionId)
  .then(() => {
    console.log('\n✅ Debugging complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Debugging failed:', error);
    process.exit(1);
  });