/**
 * Upload Integration Diagnostic Script
 * ===================================
 * Diagnoses the mismatch between UIAPP upload behavior and Love Retold expectations
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
const storage = admin.storage();

// Test session ID
const sessionId = process.argv[2] || 'j4e19zc-firstspa-myCtZuIW-myCtZuIW-1755603545';

async function diagnoseUploadIntegration(sessionId) {
  console.log('🔍 Love Retold Upload Integration Diagnosis');
  console.log('=' .repeat(60));
  console.log(`Session ID: ${sessionId}`);
  console.log('');
  
  try {
    // Parse session ID to understand Love Retold structure
    console.log('📊 Step 1: Love Retold Session Structure Analysis');
    const parts = sessionId.split('-');
    if (parts.length === 5) {
      const [randomPrefix, promptId, userId, storytellerId, timestamp] = parts;
      console.log(`   ✅ Valid Love Retold session format`);
      console.log(`   → User ID: ${userId} (truncated in session ID)`);
      console.log(`   → Storyteller ID: ${storytellerId}`);
      console.log(`   → Prompt ID: ${promptId}`);
    } else {
      console.log(`   ❌ Invalid session format (expected 5 parts, got ${parts.length})`);
      return;
    }
    
    // Check if session document exists
    console.log('\n📄 Step 2: Love Retold Session Document Check');
    const sessionDoc = await db.collection('recordingSessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      console.log('   ❌ No session document found');
      return;
    }
    
    const sessionData = sessionDoc.data();
    const fullUserId = sessionData.userId;
    console.log(`   ✅ Session document found`);
    console.log(`   → Full User ID: ${fullUserId}`);
    console.log(`   → Status: ${sessionData.status}`);
    console.log(`   → Created: ${sessionData.createdAt?.toDate()}`);
    
    // Check what Love Retold expects vs what UIAPP does
    console.log('\n🎯 Step 3: Storage Path Analysis');
    
    // Love Retold expected paths
    console.log('   Love Retold Expected Paths:');
    console.log(`   → Chunks: users/${fullUserId}/recordings/${sessionId}/chunks/`);
    console.log(`   → Final: users/${fullUserId}/recordings/${sessionId}/final/recording.mp4`);
    console.log(`   → Thumbnail: users/${fullUserId}/recordings/${sessionId}/thumbnail.jpg`);
    
    // UIAPP current behavior
    const uiappSessionId = `recording_${Date.now()}_abc123`;
    console.log('\n   ❌ UIAPP Current Behavior:');
    console.log(`   → Random Session ID: ${uiappSessionId}`);
    console.log(`   → Anonymous User: users/anonymous/recordings/${uiappSessionId}/`);
    console.log('   → RESULT: Love Retold cannot find the recordings!');
    
    // Check if any recordings exist in expected locations
    console.log('\n📁 Step 4: Storage Location Check');
    const bucket = storage.bucket();
    
    try {
      // Check if Love Retold path exists
      const expectedPrefix = `users/${fullUserId}/recordings/${sessionId}/`;
      console.log(`   Checking: ${expectedPrefix}`);
      
      const [files] = await bucket.getFiles({ prefix: expectedPrefix, maxResults: 10 });
      if (files.length > 0) {
        console.log(`   ✅ Found ${files.length} files in Love Retold expected location:`);
        files.forEach((file, index) => {
          console.log(`   → File ${index + 1}: ${file.name}`);
        });
      } else {
        console.log(`   ❌ No files found in Love Retold expected location`);
      }
      
      // Check for UIAPP-style uploads
      const uiappPrefix = 'users/anonymous/recordings/';
      const [uiappFiles] = await bucket.getFiles({ prefix: uiappPrefix, maxResults: 10 });
      if (uiappFiles.length > 0) {
        console.log(`\n   ⚠️ Found ${uiappFiles.length} UIAPP uploads in anonymous location:`);
        uiappFiles.slice(0, 5).forEach((file, index) => {
          console.log(`   → File ${index + 1}: ${file.name}`);
        });
        if (uiappFiles.length > 5) {
          console.log(`   → ... and ${uiappFiles.length - 5} more files`);
        }
        console.log('   → These files are NOT accessible to Love Retold!');
      }
      
    } catch (storageError) {
      console.log(`   ⚠️ Storage check failed: ${storageError.message}`);
    }
    
    // Integration requirements summary
    console.log('\n🔧 Step 5: Integration Fix Requirements');
    console.log('   UIAPP Must Change:');
    console.log(`   1. Use actual sessionId: "${sessionId}"`);
    console.log(`   2. Use actual userId: "${fullUserId}"`);
    console.log(`   3. Upload to: users/${fullUserId}/recordings/${sessionId}/`);
    console.log(`   4. Update recordingSessions document after upload`);
    console.log(`   5. Follow Love Retold naming conventions`);
    
    console.log('\n   Love Retold Must Provide:');
    console.log('   1. Exact storage path specifications');
    console.log('   2. Chunk size and naming requirements');
    console.log('   3. Required Firestore fields after upload');
    console.log('   4. File format preferences and requirements');
    console.log('   5. Upload completion notification mechanism');
    
  } catch (error) {
    console.error('💥 Error during diagnosis:', error);
  }
}

// Run the diagnosis
diagnoseUploadIntegration(sessionId)
  .then(() => {
    console.log('\n✅ Diagnosis complete');
    console.log('\n📋 Next Steps:');
    console.log('1. Review LOVE_RETOLD_INTEGRATION_REQUIREMENTS.md');
    console.log('2. Get answers from Love Retold team');
    console.log('3. Implement integration fixes');
    console.log('4. Test with real session URLs');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Diagnosis failed:', error);
    process.exit(1);
  });