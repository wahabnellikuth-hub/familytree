import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
} from 'firebase/firestore';
import { getDatabase, ref, set, get, remove } from 'firebase/database';
import { FamilyTreeData, TreeMeta } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyB0huYIbDz-7mRCzLleh1SyyM6A770GF_4",
  authDomain: "familytree-91354.firebaseapp.com",
  databaseURL: "https://familytree-91354-default-rtdb.firebaseio.com",
  projectId: "familytree-91354",
  storageBucket: "familytree-91354.firebasestorage.app",
  messagingSenderId: "910221386886",
  appId: "1:910221386886:web:5402cf75f0fd2de0069d07",
  measurementId: "G-CS7QVGLGCK"
};

// Initialize Firebase safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Realtime Database
export const rtdb = getDatabase(app);

// Initialize Analytics if supported in the browser
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

const FIRESTORE_COLLECTION = 'family_trees';
const RTDB_ROOT = 'trees';

/**
 * Saves tree to Firebase Realtime Database and Firestore.
 */
export async function saveTreeToCloud(tree: FamilyTreeData): Promise<boolean> {
  const dataToSave = {
    ...tree,
    updatedAt: Date.now(),
  };

  let savedRTDB = false;
  let savedFirestore = false;

  // 1. Save to Realtime Database
  try {
    const treeRef = ref(rtdb, `${RTDB_ROOT}/${tree.id}`);
    await set(treeRef, dataToSave);
    savedRTDB = true;
  } catch (err) {
    console.warn('Realtime Database save note:', err);
  }

  // 2. Save to Firestore
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, tree.id);
    await setDoc(docRef, dataToSave, { merge: true });
    savedFirestore = true;
  } catch (err) {
    console.warn('Firestore save note:', err);
  }

  return savedRTDB || savedFirestore;
}

/**
 * Loads a tree from Cloud (checks Realtime Database first, then Firestore).
 */
export async function getTreeFromCloud(id: string): Promise<FamilyTreeData | null> {
  // Try Realtime Database first
  try {
    const treeRef = ref(rtdb, `${RTDB_ROOT}/${id}`);
    const snapshot = await get(treeRef);
    if (snapshot.exists()) {
      return snapshot.val() as FamilyTreeData;
    }
  } catch (err) {
    console.warn('Realtime Database load note:', err);
  }

  // Fallback to Firestore
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as FamilyTreeData;
    }
  } catch (err) {
    console.warn('Firestore load note:', err);
  }

  return null;
}

/**
 * Gets metadata of all trees stored in Cloud.
 */
export async function getAllTreesFromCloud(): Promise<TreeMeta[]> {
  const metaMap = new Map<string, TreeMeta>();

  // 1. Fetch from Realtime Database
  try {
    const treesRef = ref(rtdb, RTDB_ROOT);
    const snapshot = await get(treesRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const val of Object.values<any>(data)) {
        if (val && val.id && val.title) {
          metaMap.set(val.id, {
            id: val.id,
            title: val.title,
            rootName: val.people?.[val.rootPersonId]?.name || 'Unknown',
            personCount: Object.keys(val.people || {}).length,
            updatedAt: val.updatedAt || Date.now(),
          });
        }
      }
    }
  } catch (err) {
    console.warn('Realtime Database list note:', err);
  }

  // 2. Fetch from Firestore
  try {
    const colRef = collection(db, FIRESTORE_COLLECTION);
    const snapshot = await getDocs(colRef);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as FamilyTreeData;
      if (data && data.id && data.title) {
        const existing = metaMap.get(data.id);
        if (!existing || (data.updatedAt && data.updatedAt > existing.updatedAt)) {
          metaMap.set(data.id, {
            id: data.id,
            title: data.title,
            rootName: data.people?.[data.rootPersonId]?.name || 'Unknown',
            personCount: Object.keys(data.people || {}).length,
            updatedAt: data.updatedAt || Date.now(),
          });
        }
      }
    });
  } catch (err) {
    console.warn('Firestore list note:', err);
  }

  const list = Array.from(metaMap.values());
  list.sort((a, b) => b.updatedAt - a.updatedAt);
  return list;
}

/**
 * Deletes tree from Cloud (both Realtime Database and Firestore).
 */
export async function deleteTreeFromCloud(id: string): Promise<boolean> {
  let success = false;
  try {
    const treeRef = ref(rtdb, `${RTDB_ROOT}/${id}`);
    await remove(treeRef);
    success = true;
  } catch (err) {
    console.warn('Realtime Database delete note:', err);
  }

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, id);
    await deleteDoc(docRef);
    success = true;
  } catch (err) {
    console.warn('Firestore delete note:', err);
  }

  return success;
}

// Backwards-compatible aliases
export const saveTreeToFirestore = saveTreeToCloud;
export const getTreeFromFirestore = getTreeFromCloud;
export const getAllTreesFromFirestore = getAllTreesFromCloud;
export const deleteTreeFromFirestore = deleteTreeFromCloud;
