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
import { FamilyTreeData, TreeMeta } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyB0huYIbDz-7mRCzLleh1SyyM6A770GF_4",
  authDomain: "familytree-91354.firebaseapp.com",
  projectId: "familytree-91354",
  storageBucket: "familytree-91354.firebasestorage.app",
  messagingSenderId: "910221386886",
  appId: "1:910221386886:web:5402cf75f0fd2de0069d07",
  measurementId: "G-CS7QVGLGCK"
};

// Initialize Firebase safely (avoiding duplicate initialization)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Analytics if supported in the browser
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

const COLLECTION_NAME = 'family_trees';

/**
 * Saves a family tree to Firebase Firestore.
 */
export async function saveTreeToFirestore(tree: FamilyTreeData): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTION_NAME, tree.id);
    const dataToSave = {
      ...tree,
      updatedAt: Date.now(),
    };
    await setDoc(docRef, dataToSave, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firebase Firestore save notice (offline or permission):', error);
    return false;
  }
}

/**
 * Loads a family tree by ID from Firebase Firestore.
 */
export async function getTreeFromFirestore(id: string): Promise<FamilyTreeData | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as FamilyTreeData;
    }
    return null;
  } catch (error) {
    console.warn('Firebase Firestore load notice:', error);
    return null;
  }
}

/**
 * Gets all family trees metadata from Firebase Firestore.
 */
export async function getAllTreesFromFirestore(): Promise<TreeMeta[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);
    const list: TreeMeta[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as FamilyTreeData;
      if (data && data.id && data.title) {
        list.push({
          id: data.id,
          title: data.title,
          rootName: data.people?.[data.rootPersonId]?.name || 'Unknown',
          personCount: Object.keys(data.people || {}).length,
          updatedAt: data.updatedAt || Date.now(),
        });
      }
    });

    list.sort((a, b) => b.updatedAt - a.updatedAt);
    return list;
  } catch (error) {
    console.warn('Firebase Firestore list notice:', error);
    return [];
  }
}

/**
 * Deletes a family tree from Firebase Firestore.
 */
export async function deleteTreeFromFirestore(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn('Firebase Firestore delete notice:', error);
    return false;
  }
}
