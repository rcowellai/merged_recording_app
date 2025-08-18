// Quick script to check existing test sessions in Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyANLphl5Wa1y57liHH99hbHVlhiYF1_uMs",
  authDomain: "love-retold-dev.firebaseapp.com",
  projectId: "love-retold-dev",
  storageBucket: "love-retold-dev.firebasestorage.app",
  messagingSenderId: "816308037330",
  appId: "1:816308037330:web:4e9518d85414552f326f0b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTestSessions() {
  try {
    console.log('🔍 Checking for existing recording sessions...\n');
    
    // Check specific test session IDs from the documentation
    const testSessionIds = [
      'epic15_active_session_1',
      'epic15_active_session_2', 
      'epic15_expired_session',
      'epic15_completed_session',
      'epic15_removed_session'
    ];
    
    const workingUrls = [];
    const allUrls = [];
    
    for (const sessionId of testSessionIds) {
      const docRef = doc(db, 'recordingSessions', sessionId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const url = `http://localhost:3004/record/${sessionId}`;
        
        console.log(`✅ ${sessionId}:`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Question: ${data.questionText || data.question || 'No question text'}`);
        console.log(`   URL: ${url}`);
        console.log('');
        
        allUrls.push({ sessionId, status: data.status, url });
        
        if (data.status === 'active' || data.status === 'waiting') {
          workingUrls.push(url);
        }
      } else {
        console.log(`❌ ${sessionId}: Not found`);
      }
    }
    
    // Also check for any other recording sessions
    const querySnapshot = await getDocs(collection(db, 'recordingSessions'));
    console.log(`\n📊 Total recording sessions found: ${querySnapshot.size}`);
    
    if (querySnapshot.size > testSessionIds.length) {
      console.log('\n🔍 Additional sessions found:');
      querySnapshot.forEach((doc) => {
        if (!testSessionIds.includes(doc.id)) {
          const data = doc.data();
          const url = `http://localhost:3004/record/${doc.id}`;
          console.log(`   ${doc.id}: Status=${data.status}, URL=${url}`);
          
          if (data.status === 'active' || data.status === 'waiting') {
            workingUrls.push(url);
          }
        }
      });
    }
    
    console.log('\n🚀 READY TO TEST URLs:');
    if (workingUrls.length > 0) {
      workingUrls.forEach(url => console.log(`   ${url}`));
    } else {
      console.log('   ❌ No active sessions found - you may need to create test data');
    }
    
    console.log('\n📋 All available test URLs:');
    allUrls.forEach(({ sessionId, status, url }) => {
      const emoji = status === 'active' ? '✅' : status === 'expired' ? '⏰' : status === 'completed' ? '✅' : '🚫';
      console.log(`   ${emoji} ${url} (${status})`);
    });
    
  } catch (error) {
    console.error('Error checking sessions:', error);
  }
}

checkTestSessions();