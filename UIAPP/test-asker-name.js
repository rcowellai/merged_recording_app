/**
 * Test AskerName Field Script
 * ===========================
 * Tests if Love Retold's backend is now sending the askerName field
 * after their January 20, 2025 deployment
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'love-retold-webapp'
  });
}

const db = admin.firestore();

// Test session ID
const sessionId = process.argv[2] || 'j4e19zc-firstspa-myCtZuIW-myCtZuIW-1755603545';

async function testAskerNameField(sessionId) {
  console.log('🧪 Testing Love Retold AskerName Field Implementation');
  console.log('=' .repeat(60));
  console.log(`Session ID: ${sessionId}`);
  console.log(`Love Retold Deployment: January 20, 2025`);
  console.log('');
  
  try {
    // Get the session document directly from Firestore
    console.log('📄 Step 1: Fetching session document from Firestore...');
    const sessionDoc = await db.collection('recordingSessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      console.log('❌ Session document not found');
      console.log('   → Try creating a new session after Love Retold\'s deployment');
      return;
    }
    
    const sessionData = sessionDoc.data();
    console.log('✅ Session document found');
    
    // Check for the new askerName field
    console.log('\n🎯 Step 2: Checking for askerName field...');
    console.log(`   askerName: "${sessionData.askerName || 'NOT_FOUND'}"`);
    console.log(`   storytellerName: "${sessionData.storytellerName || 'NOT_FOUND'}"`);
    console.log(`   Type of askerName: ${typeof sessionData.askerName}`);
    console.log(`   Has askerName: ${!!sessionData.askerName}`);
    
    // Analyze the session age to determine if it's pre or post deployment
    console.log('\n📅 Step 3: Session Age Analysis...');
    const createdAt = sessionData.createdAt;
    if (createdAt) {
      const sessionDate = createdAt.toDate();
      const deploymentDate = new Date('2025-01-20');
      const isPostDeployment = sessionDate > deploymentDate;
      
      console.log(`   Created: ${sessionDate.toISOString()}`);
      console.log(`   Love Retold Deployment: ${deploymentDate.toISOString()}`);
      console.log(`   Post-deployment session: ${isPostDeployment ? 'YES' : 'NO'}`);
      
      if (!isPostDeployment) {
        console.log('   ⚠️ This is a LEGACY session (before Jan 20, 2025)');
        console.log('   ⚠️ May not have askerName field - test with new session');
      }
    }
    
    // Test the display logic
    console.log('\n💻 Step 4: UIAPP Display Logic Test...');
    
    // Simulate the PromptCard logic
    const displayName = sessionData.askerName ||
                       sessionData.storytellerName ||
                       'Unknown';
    
    console.log('   PromptCard Logic Simulation:');
    console.log(`   → sessionData.askerName: "${sessionData.askerName || 'undefined'}"`);
    console.log(`   → sessionData.storytellerName: "${sessionData.storytellerName || 'undefined'}"`);
    console.log(`   → Final display: "${displayName} asked"`);
    
    // Diagnosis
    console.log('\n🔬 Step 5: Diagnosis...');
    
    if (sessionData.askerName && sessionData.askerName !== 'Unknown') {
      console.log('✅ SUCCESS: askerName field is working!');
      console.log(`   → Will display: "${sessionData.askerName} asked"`);
      console.log('   → Love Retold\'s fix is working correctly');
    } else if (sessionData.askerName === 'Unknown') {
      console.log('⚠️ PARTIAL: askerName field exists but is "Unknown"');
      console.log('   → This means Love Retold couldn\'t resolve the user\'s name');
      console.log('   → Check user profile data in Love Retold system');
    } else if (!sessionData.askerName && sessionData.storytellerName && sessionData.storytellerName !== 'Unknown') {
      console.log('📊 LEGACY: No askerName, but storytellerName works');
      console.log(`   → Will display: "${sessionData.storytellerName} asked" (fallback)`);
      console.log('   → Create new session to test askerName field');
    } else {
      console.log('❌ ISSUE: Neither askerName nor storytellerName work');
      console.log('   → Both fields are missing or "Unknown"');
      console.log('   → May need Love Retold team investigation');
    }
    
  } catch (error) {
    console.error('💥 Error during testing:', error);
  }
}

// Run the test
testAskerNameField(sessionId)
  .then(() => {
    console.log('\n✅ Testing complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Testing failed:', error);
    process.exit(1);
  });