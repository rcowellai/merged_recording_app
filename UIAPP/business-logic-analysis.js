/**
 * Business Logic Analysis Script
 * ==============================
 * Analyzes the Love Retold session structure to understand the business logic
 * for storyteller name display.
 * 
 * Key Finding: The UI should show the PROMPT CREATOR's name, not the storyteller's name
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

// Parse command line arguments
const sessionId = process.argv[2] || 'j4e19zc-firstspa-myCtZuIW-myCtZuIW-1755603545';

async function analyzeBusinessLogic(sessionId) {
  console.log('🔍 Business Logic Analysis');
  console.log('=' .repeat(50));
  console.log(`Session ID: ${sessionId}`);
  
  try {
    // Parse the session ID to understand the components
    console.log('\n📊 Step 1: Session ID Structure Analysis');
    const parts = sessionId.split('-');
    if (parts.length === 5) {
      const [randomPrefix, promptId, userId, storytellerId, timestamp] = parts;
      console.log(`   Random Prefix: ${randomPrefix}`);
      console.log(`   Prompt ID: ${promptId}`);
      console.log(`   User ID (Account Owner): ${userId}`);
      console.log(`   Storyteller ID (Assigned Answerer): ${storytellerId}`);
      console.log(`   Timestamp: ${timestamp}`);
      console.log(`   Same Person?: ${userId === storytellerId ? 'YES' : 'NO'}`);
      
      // Get session document
      console.log('\n📄 Step 2: Session Document Analysis');
      const sessionDoc = await db.collection('recordingSessions').doc(sessionId).get();
      
      if (!sessionDoc.exists) {
        console.log('❌ Session document not found');
        return;
      }
      
      const sessionData = sessionDoc.data();
      console.log(`   Current storytellerName: "${sessionData.storytellerName}"`);
      console.log(`   Session userId: ${sessionData.userId}`);
      console.log(`   Session storytellerId: ${sessionData.storytellerId}`);
      
      // Business Logic Analysis
      console.log('\n🎯 Step 3: Business Logic Analysis');
      console.log('   Current Implementation:');
      console.log(`   → Tries to resolve storytellerId: ${storytellerId}`);
      console.log(`   → Looks up storyteller document for firstName`);
      console.log(`   → Result: "${sessionData.storytellerName}"`);
      
      console.log('\n   ✅ CORRECT Business Logic (Per User Clarification):');
      console.log(`   → Should resolve userId: ${userId}`);
      console.log(`   → Should look up the PROMPT CREATOR's name`);
      console.log(`   → Should ALWAYS show who asked the question`);
      console.log(`   → Result should be: "[Account Owner's Name] asked"`);
      
      // Check if we can find the user document
      console.log('\n👤 Step 4: User Document Lookup (Correct Approach)');
      try {
        // Try different possible user document structures
        console.log(`   Looking for user document: ${userId}`);
        
        // Check users collection
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          console.log('   ✅ Found user document in "users" collection');
          console.log(`   → firstName: "${userData.firstName || 'NOT_SET'}"`);
          console.log(`   → lastName: "${userData.lastName || 'NOT_SET'}"`);
          console.log(`   → email: "${userData.email || 'NOT_SET'}"`);
        } else {
          console.log('   ❌ No user document found in "users" collection');
        }
        
        // Check if user is also in storytellers collection
        const storytellerDoc = await db.collection('storytellers').doc(userId).get();
        if (storytellerDoc.exists) {
          const storytellerData = storytellerDoc.data();
          console.log('   ✅ User also exists in "storytellers" collection');
          console.log(`   → firstName: "${storytellerData.firstName || 'NOT_SET'}"`);
        } else {
          console.log('   ❌ User not found in "storytellers" collection');
        }
        
      } catch (error) {
        console.log(`   ❌ Error looking up user: ${error.message}`);
      }
      
      // Recommendation
      console.log('\n💡 Step 5: Recommendation for Love Retold');
      console.log('   ╭─────────────────────────────────────────────────╮');
      console.log('   │ ISSUE: getStorytellerFirstName() is looking up │');
      console.log('   │ the wrong ID for the business requirement       │');
      console.log('   ╰─────────────────────────────────────────────────╯');
      console.log('');
      console.log('   🔧 SOLUTION:');
      console.log('   → Change getStorytellerFirstName() to accept userId instead of storytellerId');
      console.log('   → Look up the prompt creator (account owner), not the assigned storyteller');
      console.log('   → This ensures it always shows "[Account Owner] asked"');
      console.log('');
      console.log('   📝 Code Change Needed in Love Retold:');
      console.log('   // BEFORE (incorrect):');
      console.log('   // const storytellerName = await getStorytellerFirstName(storytellerId);');
      console.log('   //');
      console.log('   // AFTER (correct):');
      console.log('   // const storytellerName = await getStorytellerFirstName(userId);');
      console.log('   //');
      console.log('   // OR rename the function to be clearer:');
      console.log('   // const promptCreatorName = await getPromptCreatorName(userId);');
      
    } else {
      console.log('❌ Invalid session ID format');
    }
    
  } catch (error) {
    console.error('💥 Error during analysis:', error);
  }
}

// Run the analysis
console.log('🎭 Love Retold Business Logic Analysis');
console.log('Testing session ID format and business logic requirements');
console.log('');

analyzeBusinessLogic(sessionId)
  .then(() => {
    console.log('\n✅ Analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  });