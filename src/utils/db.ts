import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { FamilyTreeData, TreeMeta } from '../types';
import { validateTree } from './treeOperations';

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
 */
export async function getAllTrees(): Promise<TreeMeta[]> {
  try {
    const db = await getDB();
    const trees = await db.getAllFromIndex('trees', 'by-updated');
    // Sort descending by updatedAt
    trees.sort((a, b) => b.updatedAt - a.updatedAt);

    return trees.map((t) => ({
      id: t.id,
      title: t.title,
      rootName: t.people[t.rootPersonId]?.name || 'Unknown',
      personCount: Object.keys(t.people).length,
      updatedAt: t.updatedAt,
    }));
  } catch (err) {
    console.error('Failed to get trees from IndexedDB:', err);
    return [];
  }
}

/**
 * Loads a complete family tree by ID.
 */
export async function getTree(id: string): Promise<FamilyTreeData | null> {
  try {
    const db = await getDB();
    const tree = await db.get('trees', id);
    return tree || null;
  } catch (err) {
    console.error(`Failed to load tree ${id}:`, err);
    return null;
  }
}

/**
 * Saves a family tree to IndexedDB.
 */
export async function saveTree(tree: FamilyTreeData): Promise<boolean> {
  try {
    const db = await getDB();
    const toSave: FamilyTreeData = {
      ...tree,
      updatedAt: Date.now(),
    };
    await db.put('trees', toSave);
    await db.put('meta', toSave.id, 'lastActiveTreeId');
    return true;
  } catch (err) {
    console.error('Failed to save tree:', err);
    return false;
  }
}

/**
 * Deletes a saved family tree.
 */
export async function deleteTree(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    await db.delete('trees', id);
    const lastActive = await db.get('meta', 'lastActiveTreeId');
    if (lastActive === id) {
      await db.delete('meta', 'lastActiveTreeId');
    }
    return true;
  } catch (err) {
    console.error(`Failed to delete tree ${id}:`, err);
    return false;
  }
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

