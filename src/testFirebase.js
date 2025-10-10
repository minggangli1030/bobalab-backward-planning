// src/testFirebase.js - Test Firebase Connection
import { db } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export async function testFirebaseConnection() {
  console.log('Testing Firebase connection...');
  
  try {
    // Try to read from a collection
    const testCollection = collection(db, 'test');
    const snapshot = await getDocs(testCollection);
    console.log('✅ Read successful! Documents found:', snapshot.size);
    
    // Try to write to a collection
    const docRef = await addDoc(collection(db, 'test'), {
      message: 'Hello from test!',
      timestamp: new Date().toISOString()
    });
    console.log('✅ Write successful! Document ID:', docRef.id);
    
    return true;
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    return false;
  }
}