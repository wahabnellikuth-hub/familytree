import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { FamilyTreeData, TreeMeta } from '../types';
import { validateTree } from './treeOperations';
import {
  saveTreeToCloud,
  getTreeFromCloud,
  getAllTreesFromCloud,
  deleteTreeFromCloud,
} from './firebase';

interface FamilyTreeDB extends DBSchema {
  trees: {
    key: string;
    value: FamilyTreeData;
    indexes: { 'by-updated': number };
  };
  meta: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'PaternalFamilyTreeDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FamilyTreeDB>> | null = null;

function getDB(): Promise<IDBPDatabase<FamilyTreeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FamilyTreeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const treeStore = db.createObjectStore('trees', { keyPath: 'id' });
        treeStore.createIndex('by-updated', 'updatedAt');
        db.createObjectStore('meta');
      },
    });
  }
  return dbPromise;
}

/**
 * Retrieves all saved family trees as metadata for the dashboard list.
 * Merges local IndexedDB trees with cloud Firebase Firestore trees.
 */
export async function getAllTrees(): Promise<TreeMeta[]> {
  const metaMap = new Map<string, TreeMeta>();

  // 1. Fetch local IndexedDB trees
  try {
    const db = await getDB();
    const localTrees = await db.getAllFromIndex('trees', 'by-updated');
    for (const t of localTrees) {
      metaMap.set(t.id, {
        id: t.id,
        title: t.title,
        rootName: t.people[t.rootPersonId]?.name || 'Unknown',
        personCount: Object.keys(t.people).length,
        updatedAt: t.updatedAt,
      });
    }
  } catch (err) {
    console.error('Failed to get trees from IndexedDB:', err);
  }

  // 2. Fetch cloud trees from Firebase (Realtime Database & Firestore)
  try {
    const cloudTrees = await getAllTreesFromCloud();
    for (const ct of cloudTrees) {
      const existing = metaMap.get(ct.id);
      if (!existing || ct.updatedAt > existing.updatedAt) {
        metaMap.set(ct.id, ct);
      }
    }
  } catch (err) {
    console.warn('Could not reach Firebase Cloud for tree list:', err);
  }

  const result = Array.from(metaMap.values());
  result.sort((a, b) => b.updatedAt - a.updatedAt);
  return result;
}

/**
 * Loads a complete family tree by ID.
 * First checks local IndexedDB; if missing or outdated, loads from Firebase Firestore.
 */
export async function getTree(id: string): Promise<FamilyTreeData | null> {
  let localTree: FamilyTreeData | null = null;
  try {
    const db = await getDB();
    localTree = (await db.get('trees', id)) || null;
  } catch (err) {
    console.error(`Failed to load tree ${id} from IndexedDB:`, err);
  }

  // Check Firebase Cloud
  try {
    const cloudTree = await getTreeFromCloud(id);
    if (cloudTree) {
      if (!localTree || cloudTree.updatedAt > localTree.updatedAt) {
        // Cache to local IndexedDB
        const db = await getDB();
        await db.put('trees', cloudTree);
        return cloudTree;
      }
    }
  } catch (err) {
    console.warn('Firebase Cloud load error:', err);
  }

  return localTree;
}

/**
 * Saves a family tree to both local IndexedDB and Firebase Cloud.
 */
export async function saveTree(tree: FamilyTreeData): Promise<boolean> {
  const toSave: FamilyTreeData = {
    ...tree,
    updatedAt: Date.now(),
  };

  // 1. Save to local IndexedDB for instant UI response and offline capability
  try {
    const db = await getDB();
    await db.put('trees', toSave);
    await db.put('meta', toSave.id, 'lastActiveTreeId');
  } catch (err) {
    console.error('Failed to save tree to IndexedDB:', err);
    return false;
  }

  // 2. Sync to Firebase Cloud (Realtime Database & Firestore) asynchronously in the background
  saveTreeToCloud(toSave).catch((err) => {
    console.warn('Background Firebase sync note:', err);
  });

  return true;
}

/**
 * Deletes a saved family tree locally and from Firebase Cloud.
 */
export async function deleteTree(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    await db.delete('trees', id);
    const lastActive = await db.get('meta', 'lastActiveTreeId');
    if (lastActive === id) {
      await db.delete('meta', 'lastActiveTreeId');
    }
  } catch (err) {
    console.error(`Failed to delete tree ${id} from IndexedDB:`, err);
  }

  // Delete from Cloud
  deleteTreeFromCloud(id).catch((err) => {
    console.warn('Background Firebase delete note:', err);
  });

  return true;
}

/**
 * Duplicates a family tree with a new ID and title.
 */
export async function duplicateTree(id: string): Promise<FamilyTreeData | null> {
  try {
    const original = await getTree(id);
    if (!original) return null;

    const newId = `tree_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const duplicate: FamilyTreeData = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveTree(duplicate);
    return duplicate;
  } catch (err) {
    console.error('Failed to duplicate tree:', err);
    return null;
  }
}

/**
 * Gets the last active tree ID from IndexedDB.
 */
export async function getLastActiveTreeId(): Promise<string | null> {
  try {
    const db = await getDB();
    const id = await db.get('meta', 'lastActiveTreeId');
    return id || null;
  } catch (err) {
    return null;
  }
}

/**
 * Sets the last active tree ID.
 */
export async function setLastActiveTreeId(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.put('meta', id, 'lastActiveTreeId');
  } catch (err) {
    console.error('Failed to set last active tree ID:', err);
  }
}

/**
 * Exports a family tree as formatted JSON string.
 */
export function exportTreeAsJSON(tree: FamilyTreeData): string {
  return JSON.stringify(tree, null, 2);
}

/**
 * Imports and validates a JSON string.
 */
export function parseAndValidateTreeJSON(jsonStr: string): { valid: boolean; tree?: FamilyTreeData; error?: string } {
  try {
    const data = JSON.parse(jsonStr) as FamilyTreeData;
    const validation = validateTree(data);
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }
    return { valid: true, tree: data };
  } catch (err: any) {
    return { valid: false, error: `Invalid JSON format: ${err.message}` };
  }
}
