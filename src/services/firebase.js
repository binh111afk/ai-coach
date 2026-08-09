// src/services/firebase.js
// Firebase initialization — Cloud Firestore sync backend

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Get single item from Cloud Firestore collection
 */
export async function fsGet(storeName, key) {
  try {
    const docRef = doc(db, storeName, String(key));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn(`⚠️ [Firestore] get(${storeName}, ${key}) offline/warn:`, err.message);
    return null;
  }
}

/**
 * Get all items from Cloud Firestore collection
 */
export async function fsGetAll(storeName) {
  try {
    const colRef = collection(db, storeName);
    const snap = await getDocs(colRef);
    return snap.docs.map(d => d.data());
  } catch (err) {
    console.warn(`⚠️ [Firestore] getAll(${storeName}) offline/warn:`, err.message);
    return [];
  }
}

/**
 * Put item into Cloud Firestore collection
 */
export async function fsPut(storeName, item, customKey = null) {
  try {
    const docKey = customKey || item.id || item.date || item.key || 'default';
    const docRef = doc(db, storeName, String(docKey));
    await setDoc(docRef, item, { merge: true });
    return docKey;
  } catch (err) {
    console.warn(`⚠️ [Firestore] put(${storeName}) offline/warn:`, err.message);
    return null;
  }
}

/**
 * Delete item from Cloud Firestore collection
 */
export async function fsDelete(storeName, key) {
  try {
    const docRef = doc(db, storeName, String(key));
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn(`⚠️ [Firestore] delete(${storeName}, ${key}) offline/warn:`, err.message);
    return false;
  }
}
