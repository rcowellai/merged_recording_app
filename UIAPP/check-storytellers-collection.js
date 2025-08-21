/**
 * Check Storytellers Collection
 * ============================
 * Inspects the storytellers collection to understand the data structure
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

async function checkStorytellersCollection() {
  console.log('🔍 Inspecting storytellers collection...');
  console.log('=' .repeat(50));
  
  try {
    // Get all storytellers documents (limit to first 10 for safety)
    const storytellersSnapshot = await db.collection('storytellers').limit(10).get();
    
    console.log(`📊 Found ${storytellersSnapshot.size} storyteller documents`);
    
    if (storytellersSnapshot.empty) {
      console.log('❌ No storyteller documents found!');
      console.log('   → This explains why storytellerName is "Unknown"');
      console.log('   → Love Retold needs to create storyteller documents');
      return;
    }
    
    storytellersSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n👤 Storyteller ${index + 1}:`);
      console.log(`   Document ID: ${doc.id}`);
      console.log(`   firstName: "${data.firstName || 'NOT_SET'}"`);
      console.log(`   lastName: "${data.lastName || 'NOT_SET'}"`);
      console.log(`   userId: ${data.userId || 'NOT_SET'}`);
      console.log(`   email: ${data.email || 'NOT_SET'}`);
      
      // Show all fields for first document
      if (index === 0) {
        console.log('   All fields:', Object.keys(data));
      }
    });
    
    // Check if our specific storyteller exists
    console.log('\n🎯 Checking for specific storyteller...');
    const targetId = 'myCtZuIWCSX6J0S7QEyI5ISU2Xk1';
    const targetDoc = await db.collection('storytellers').doc(targetId).get();
    
    if (targetDoc.exists) {
      console.log('✅ Target storyteller found!');
      const data = targetDoc.data();
      console.log(`   firstName: "${data.firstName}"`);
    } else {
      console.log('❌ Target storyteller NOT found');
      console.log(`   Looking for: ${targetId}`);
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkStorytellersCollection()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });