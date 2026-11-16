import { FamilyTreeData, Person, BranchDirection } from '../types';

/**
 * Deeply sanitizes and heals a tree structure, ensuring all required arrays,
 * reciprocal relationships, and default values are strictly present.
 * Prevents runtime crashes from Cloud database omission of empty arrays/nulls.
 */
export function sanitizeTreeData(tree: any): FamilyTreeData {
  if (!tree || typeof tree !== 'object') {
    throw new Error('Invalid tree data structure');
  }

  const rawPeople = tree.people || {};
  const sanitizedPeople: Record<string, Person> = {};

  // First pass: sanitize each person object with complete defaults
  for (const [id, rawPerson] of Object.entries<any>(rawPeople)) {
    if (!rawPerson) continue;
    const personId = String(rawPerson.id || id);
    sanitizedPeople[personId] = {
      id: personId,
      name: typeof rawPerson.name === 'string' && rawPerson.name.trim() ? rawPerson.name.trim() : 'Unnamed',
      parentId: rawPerson.parentId ? String(rawPerson.parentId) : null,
      childrenIds: Array.isArray(rawPerson.childrenIds)
        ? rawPerson.childrenIds.map(String).filter(Boolean)
        : [],
      generation: typeof rawPerson.generation === 'number' && !isNaN(rawPerson.generation) ? rawPerson.generation : 1,
      isPlaceholder: Boolean(rawPerson.isPlaceholder),
      branchDirection: (['inherit', 'horizontal', 'vertical', 'rays', 'staggered', 'spine-right', 'spine-left', 'alternating'].includes(rawPerson.branchDirection))
        ? rawPerson.branchDirection
        : 'inherit',
    };
  }

  // Second pass: heal reciprocal father-son relationships and clean broken links
  for (const [id, person] of Object.entries(sanitizedPeople)) {
    // Filter out children IDs that do not exist in people map
    person.childrenIds = (person.childrenIds || []).filter((cid) => !!sanitizedPeople[cid]);

    // Ensure children point back to this father
    for (const cid of person.childrenIds) {
      if (sanitizedPeople[cid]) {
        sanitizedPeople[cid].parentId = id;
      }
    }
  }

  // Ensure root exists
  let rootId = tree.rootPersonId;
  if (!rootId || !sanitizedPeople[rootId]) {
    // Find node with no parent, or first node
    const candidateRoot = Object.values(sanitizedPeople).find((p) => p.parentId === null);
    if (candidateRoot) {
      rootId = candidateRoot.id;
    } else {
      rootId = Object.keys(sanitizedPeople)[0] || `p_root_${Date.now()}`;
      if (!sanitizedPeople[rootId]) {
        sanitizedPeople[rootId] = {
          id: rootId,
          name: 'Grandfather',
          parentId: null,
          childrenIds: [],
          generation: 1,
        };
      }
    }
  }

  if (sanitizedPeople[rootId]) {
    sanitizedPeople[rootId].parentId = null;
  }

  return {
    id: String(tree.id || `tree_${Date.now()}`),
    title: String(tree.title || 'Family Tree'),
    rootPersonId: rootId,
    people: sanitizedPeople,
    layoutMode: tree.layoutMode === 'horizontal' ? 'horizontal' : 'vertical',
    collapsedBranchIds: Array.isArray(tree.collapsedBranchIds)
      ? tree.collapsedBranchIds.map(String).filter(Boolean)
      : [],
    fontFamily: tree.fontFamily || 'Noto Sans Malayalam',
    createdAt: typeof tree.createdAt === 'number' ? tree.createdAt : Date.now(),
    updatedAt: typeof tree.updatedAt === 'number' ? tree.updatedAt : Date.now(),
  };
}

/**
 * Validates a family tree:
 * 1. Has rootPersonId and root exists
 * 2. Root has no parent (parentId === null)
 * 3. Every other person has a parentId that exists in the tree
 * 4. Paternal lineage: no cycles (ancestor cannot be descendant)
 * 5. All child references are reciprocal
 */
export function validateTree(tree: FamilyTreeData): { valid: boolean; error?: string } {
  if (!tree.id || !tree.title) {
    return { valid: false, error: 'Tree must have an ID and a title.' };
  }

  if (!tree.rootPersonId || !tree.people[tree.rootPersonId]) {
    return { valid: false, error: 'Tree is missing a valid starting ancestor (grandfather).' };
  }

  const root = tree.people[tree.rootPersonId];
  if (root.parentId !== null) {
    return { valid: false, error: 'The starting grandfather cannot have a parent in this paternal chart.' };
  }

  // Check all people
  for (const [id, person] of Object.entries(tree.people)) {
    if (id !== tree.rootPersonId) {
      if (!person.parentId || !tree.people[person.parentId]) {
        return { valid: false, error: `Person "${person.name}" has an invalid or missing father reference.` };
      }
    }

    // Verify children exist
    for (const childId of (person.childrenIds || [])) {
      const child = tree.people[childId];
      if (!child) {
        return { valid: false, error: `Person "${person.name}" references non-existent child ${childId}.` };
      }
      if (child.parentId !== id) {
        return { valid: false, error: `Child "${child.name}" does not match father "${person.name}".` };
      }
    }
  }

  // Check for cycles
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(currentId: string): boolean {
    visited.add(currentId);
    recStack.add(currentId);

    const person = tree.people[currentId];
    if (person) {
      for (const childId of (person.childrenIds || [])) {
        if (!visited.has(childId)) {
          if (hasCycle(childId)) return true;
        } else if (recStack.has(childId)) {
          return true; // Cycle detected
        }
      }
    }

    recStack.delete(currentId);
    return false;
  }

  if (hasCycle(tree.rootPersonId)) {
    return { valid: false, error: 'Circular relationship detected in family tree.' };
  }

  return { valid: true };
}

/**
 * Counts total descendants (children, grandchildren, great-grandchildren, etc.) below a person.
 */
export function countSubtreeDescendants(people: Record<string, Person>, personId: string): number {
  const person = people[personId];
  const children = person?.childrenIds || [];
  if (children.length === 0) {
    return 0;
  }

  let count = children.length;
  for (const childId of children) {
    count += countSubtreeDescendants(people, childId);
  }
  return count;
}

/**
 * Returns a Set of all descendant IDs for a given person.
 */
export function getDescendantIds(people: Record<string, Person>, personId: string): Set<string> {
  const result = new Set<string>();
  const stack = [...(people[personId]?.childrenIds || [])];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    result.add(currentId);
    const child = people[currentId];
    if (child && Array.isArray(child.childrenIds)) {
      stack.push(...child.childrenIds);
    }
  }

  return result;
}

/**
 * Returns an array of ancestor IDs starting from root down to person's father.
 */
export function getAncestorIds(people: Record<string, Person>, personId: string): string[] {
  const ancestors: string[] = [];
  let current = people[personId];

  while (current && current.parentId) {
    ancestors.unshift(current.parentId);
    current = people[current.parentId];
  }

  return ancestors;
}

/**
 * Recalculates generation numbers starting from a given person downward.
 */
function recalculateGenerations(
  people: Record<string, Person>,
  personId: string,
  currentGen: number
): void {
  const person = people[personId];
  if (!person) return;
  person.generation = currentGen;
  for (const childId of (person.childrenIds || [])) {
    recalculateGenerations(people, childId, currentGen + 1);
  }
}

/**
 * Adds one or more children to a father.
 */
export function addChildren(
  tree: FamilyTreeData,
  fatherId: string,
  names: string[],
  isPlaceholder: boolean = false
): FamilyTreeData {
  const father = tree.people[fatherId];
  if (!father) return tree;

  const newPeople = { ...tree.people };
  const newChildrenIds = [...(father.childrenIds || [])];

  const now = Date.now();
  for (let i = 0; i < names.length; i++) {
    const name = names[i].trim();
    if (!name && !isPlaceholder) continue;

    const childId = `p_${now}_${Math.random().toString(36).substring(2, 8)}_${i}`;
    newPeople[childId] = {
      id: childId,
      name: name || (isPlaceholder ? 'Empty Box (Reserved)' : 'Unnamed Son'),
      parentId: fatherId,
      childrenIds: [],
      generation: father.generation + 1,
      isPlaceholder: isPlaceholder,
    };
    newChildrenIds.push(childId);
  }

  newPeople[fatherId] = {
    ...father,
    childrenIds: newChildrenIds,
  };

  return {
    ...tree,
    people: newPeople,
    updatedAt: Date.now(),
  };
}

/**
 * Adds an empty placeholder box under a father.
 */
export function addEmptyPlaceholder(tree: FamilyTreeData, fatherId: string): FamilyTreeData {
  return addChildren(tree, fatherId, ['Empty Box (Reserved)'], true);
}

/**
 * Converts an empty placeholder box into a named person.
 */
export function convertPlaceholder(
  tree: FamilyTreeData,
  personId: string,
  newName: string
): FamilyTreeData {
  const person = tree.people[personId];
  if (!person) return tree;

  return {
    ...tree,
    people: {
      ...tree.people,
      [personId]: {
        ...person,
        name: newName.trim() || 'Unnamed Son',
        isPlaceholder: false,
      },
    },
    updatedAt: Date.now(),
  };
}

/**
 * Updates a person's name.
 */
export function updatePersonName(
  tree: FamilyTreeData,
  personId: string,
  newName: string
): FamilyTreeData {
  const person = tree.people[personId];
  if (!person) return tree;

  return {
    ...tree,
    people: {
      ...tree.people,
      [personId]: {
        ...person,
        name: newName.trim() || person.name,
      },
    },
    updatedAt: Date.now(),
  };
}

/**
 * Deletes a person.
 * If deleteSubtree is true, deletes person and all descendants.
 * If deleteSubtree is false and person has children, adopts children to grandfather (or father's parent).
 */
export function deletePerson(
  tree: FamilyTreeData,
  personId: string,
  deleteSubtree: boolean = true
): FamilyTreeData {
  if (personId === tree.rootPersonId) {
    // Cannot delete the root ancestor directly
    return tree;
  }

  const person = tree.people[personId];
  if (!person) return tree;

  const newPeople = { ...tree.people };
  const fatherId = person.parentId;

  if (deleteSubtree) {
    // Delete person and all descendants
    const descendants = getDescendantIds(newPeople, personId);
    descendants.add(personId);

    for (const id of descendants) {
      delete newPeople[id];
    }

    if (fatherId && newPeople[fatherId]) {
      newPeople[fatherId] = {
        ...newPeople[fatherId],
        childrenIds: (newPeople[fatherId].childrenIds || []).filter((cid) => cid !== personId),
      };
    }
  } else {
    // Keep children: re-parent children to grandfather
    if (fatherId && newPeople[fatherId]) {
      const father = newPeople[fatherId];
      const personIndex = (father.childrenIds || []).indexOf(personId);
      const newChildren = [...(father.childrenIds || [])];

      // Replace personId in father's childrenIds with person's childrenIds
      const personKids = person.childrenIds || [];
      if (personIndex !== -1) {
        newChildren.splice(personIndex, 1, ...personKids);
      } else {
        newChildren.push(...personKids);
      }

      newPeople[fatherId] = {
        ...father,
        childrenIds: newChildren,
      };

      // Update parentId and generation of each child
      for (const childId of personKids) {
        if (newPeople[childId]) {
          newPeople[childId] = {
            ...newPeople[childId],
            parentId: fatherId,
          };
          recalculateGenerations(newPeople, childId, father.generation + 1);
        }
      }
    }
    delete newPeople[personId];
  }

  // Remove from collapsed list if present
  const newCollapsed = (tree.collapsedBranchIds || []).filter((id) => id !== personId);

  return {
    ...tree,
    people: newPeople,
    collapsedBranchIds: newCollapsed,
    updatedAt: Date.now(),
  };
}

/**
 * Reorders the sibling order under a father.
 */
export function reorderChildren(
  tree: FamilyTreeData,
  fatherId: string,
  newOrderedIds: string[]
): FamilyTreeData {
  const father = tree.people[fatherId];
  if (!father) return tree;

  return {
    ...tree,
    people: {
      ...tree.people,
      [fatherId]: {
        ...father,
        childrenIds: newOrderedIds,
      },
    },
    updatedAt: Date.now(),
  };
}

/**
 * Moves a person (and their descendant branch) to a new father.
 * Validates that newFatherId is not personId and not a descendant of personId.
 */
export function movePerson(
  tree: FamilyTreeData,
  personId: string,
  newFatherId: string
): { success: boolean; tree: FamilyTreeData; error?: string } {
  if (personId === tree.rootPersonId) {
    return { success: false, tree, error: 'Cannot move the starting grandfather.' };
  }

  if (personId === newFatherId) {
    return { success: false, tree, error: 'A person cannot be their own father.' };
  }

  const person = tree.people[personId];
  const newFather = tree.people[newFatherId];
  if (!person || !newFather) {
    return { success: false, tree, error: 'Person or new father not found.' };
  }

  // Prevent cycles: new father cannot be in person's descendants!
  const descendants = getDescendantIds(tree.people, personId);
  if (descendants.has(newFatherId)) {
    return { success: false, tree, error: 'Cannot move a person under one of their own descendants (creates a circular relationship).' };
  }

  const oldFatherId = person.parentId;
  const newPeople = { ...tree.people };

  // Remove from old father
  if (oldFatherId && newPeople[oldFatherId]) {
    newPeople[oldFatherId] = {
      ...newPeople[oldFatherId],
      childrenIds: (newPeople[oldFatherId].childrenIds || []).filter((id) => id !== personId),
    };
  }

  // Add to new father
  newPeople[newFatherId] = {
    ...newFather,
    childrenIds: [...(newFather.childrenIds || []), personId],
  };

  // Update person's parentId
  newPeople[personId] = {
    ...person,
    parentId: newFatherId,
  };

  // Recalculate generations
  recalculateGenerations(newPeople, personId, newFather.generation + 1);

  return {
    success: true,
    tree: {
      ...tree,
      people: newPeople,
      updatedAt: Date.now(),
    },
  };
}

/**
 * Sets individual branch direction for a father's sons ('inherit' | 'horizontal' | 'vertical').
 */
export function setPersonBranchDirection(
  tree: FamilyTreeData,
  personId: string,
  direction: BranchDirection
): FamilyTreeData {
  const person = tree.people[personId];
  if (!person) return tree;

  return {
    ...tree,
    people: {
      ...tree.people,
      [personId]: {
        ...person,
        branchDirection: direction,
      },
    },
    updatedAt: Date.now(),
  };
}

/**
 * Toggles expansion/collapse of a person's descendant branch.
 */
export function toggleBranchCollapse(tree: FamilyTreeData, personId: string): FamilyTreeData {
  const current = tree.collapsedBranchIds || [];
  const isCollapsed = current.includes(personId);
  const newCollapsed = isCollapsed
    ? current.filter((id) => id !== personId)
    : [...current, personId];

  return {
    ...tree,
    collapsedBranchIds: newCollapsed,
  };
}
