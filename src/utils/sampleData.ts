import { FamilyTreeData } from '../types';

/**
 * Creates the sample 5-generation paternal family tree specified in Section 15:
 * Generation 1: Grandfather A
 * Generation 2: Son A1, Son A2, Son A3
 * Generation 3: A1 has 5 children; A2 has 2 children; A3 has 7 children
 * Generation 4: Some children of A1 have 3-4 children; children of A2 have none; some children of A3 have 5+ children
 * Generation 5: Several additional descendants with unequal branch sizes
 */
export function createSampleFamilyTree(): FamilyTreeData {
  const people: FamilyTreeData['people'] = {};

  // Gen 1: Root Grandfather
  const rootId = 'p_root_a';
  people[rootId] = {
    id: rootId,
    name: 'Grandfather A',
    parentId: null,
    childrenIds: ['p_a1', 'p_a2', 'p_a3'],
    generation: 1,
  };

  // Gen 2: Sons A1, A2, A3
  people['p_a1'] = {
    id: 'p_a1',
    name: 'Son A1',
    parentId: rootId,
    childrenIds: ['p_a1_1', 'p_a1_2', 'p_a1_3', 'p_a1_4', 'p_a1_5'],
    generation: 2,
  };

  people['p_a2'] = {
    id: 'p_a2',
    name: 'Son A2',
    parentId: rootId,
    childrenIds: ['p_a2_1', 'p_a2_2'],
    generation: 2,
  };

  people['p_a3'] = {
    id: 'p_a3',
    name: 'Son A3',
    parentId: rootId,
    childrenIds: ['p_a3_1', 'p_a3_2', 'p_a3_3', 'p_a3_4', 'p_a3_5', 'p_a3_6', 'p_a3_7'],
    generation: 2,
  };

  // Gen 3: Under A1 (5 children)
  people['p_a1_1'] = {
    id: 'p_a1_1',
    name: 'Grandson A1-1',
    parentId: 'p_a1',
    childrenIds: ['p_a1_1_1', 'p_a1_1_2', 'p_a1_1_3'],
    generation: 3,
  };
  people['p_a1_2'] = {
    id: 'p_a1_2',
    name: 'Grandson A1-2',
    parentId: 'p_a1',
    childrenIds: ['p_a1_2_1', 'p_a1_2_2', 'p_a1_2_3', 'p_a1_2_4'],
    generation: 3,
  };
  people['p_a1_3'] = {
    id: 'p_a1_3',
    name: 'Grandson A1-3',
    parentId: 'p_a1',
    childrenIds: [],
    generation: 3,
  };
  people['p_a1_4'] = {
    id: 'p_a1_4',
    name: 'Grandson A1-4',
    parentId: 'p_a1',
    childrenIds: ['p_a1_4_1', 'p_a1_4_2'],
    generation: 3,
  };
  people['p_a1_5'] = {
    id: 'p_a1_5',
    name: 'Grandson A1-5 (Reserved)',
    parentId: 'p_a1',
    childrenIds: [],
    generation: 3,
    isPlaceholder: true, // Example placeholder box
  };

  // Gen 3: Under A2 (2 children, neither has children)
  people['p_a2_1'] = {
    id: 'p_a2_1',
    name: 'Grandson A2-1',
    parentId: 'p_a2',
    childrenIds: [],
    generation: 3,
  };
  people['p_a2_2'] = {
    id: 'p_a2_2',
    name: 'Grandson A2-2',
    parentId: 'p_a2',
    childrenIds: [],
    generation: 3,
  };

  // Gen 3: Under A3 (7 children)
  people['p_a3_1'] = {
    id: 'p_a3_1',
    name: 'Grandson A3-1',
    parentId: 'p_a3',
    childrenIds: ['p_a3_1_1', 'p_a3_1_2', 'p_a3_1_3', 'p_a3_1_4', 'p_a3_1_5'],
    generation: 3,
  };
  people['p_a3_2'] = {
    id: 'p_a3_2',
    name: 'Grandson A3-2',
    parentId: 'p_a3',
    childrenIds: [],
    generation: 3,
  };
  people['p_a3_3'] = {
    id: 'p_a3_3',
    name: 'Grandson A3-3',
    parentId: 'p_a3',
    childrenIds: ['p_a3_3_1', 'p_a3_3_2', 'p_a3_3_3', 'p_a3_3_4', 'p_a3_3_5', 'p_a3_3_6'],
    generation: 3,
  };
  people['p_a3_4'] = {
    id: 'p_a3_4',
    name: 'Grandson A3-4',
    parentId: 'p_a3',
    childrenIds: [],
    generation: 3,
  };
  people['p_a3_5'] = {
    id: 'p_a3_5',
    name: 'Grandson A3-5',
    parentId: 'p_a3',
    childrenIds: [],
    generation: 3,
  };
  people['p_a3_6'] = {
    id: 'p_a3_6',
    name: 'Grandson A3-6',
    parentId: 'p_a3',
    childrenIds: [],
    generation: 3,
  };
  people['p_a3_7'] = {
    id: 'p_a3_7',
    name: 'Grandson A3-7',
    parentId: 'p_a3',
    childrenIds: [],
    generation: 3,
  };

  // Gen 4: Under A1-1 (3 children)
  people['p_a1_1_1'] = { id: 'p_a1_1_1', name: 'Great-Grandson A1-1a', parentId: 'p_a1_1', childrenIds: ['p_a1_1_1_gen5_1', 'p_a1_1_1_gen5_2'], generation: 4 };
  people['p_a1_1_2'] = { id: 'p_a1_1_2', name: 'Great-Grandson A1-1b', parentId: 'p_a1_1', childrenIds: [], generation: 4 };
  people['p_a1_1_3'] = { id: 'p_a1_1_3', name: 'Great-Grandson A1-1c', parentId: 'p_a1_1', childrenIds: [], generation: 4 };

  // Gen 4: Under A1-2 (4 children)
  people['p_a1_2_1'] = { id: 'p_a1_2_1', name: 'Great-Grandson A1-2a', parentId: 'p_a1_2', childrenIds: [], generation: 4 };
  people['p_a1_2_2'] = { id: 'p_a1_2_2', name: 'Great-Grandson A1-2b', parentId: 'p_a1_2', childrenIds: [], generation: 4 };
  people['p_a1_2_3'] = { id: 'p_a1_2_3', name: 'Great-Grandson A1-2c', parentId: 'p_a1_2', childrenIds: [], generation: 4 };
  people['p_a1_2_4'] = { id: 'p_a1_2_4', name: 'Great-Grandson A1-2d', parentId: 'p_a1_2', childrenIds: [], generation: 4 };

  // Gen 4: Under A1-4 (2 children)
  people['p_a1_4_1'] = { id: 'p_a1_4_1', name: 'Great-Grandson A1-4a', parentId: 'p_a1_4', childrenIds: [], generation: 4 };
  people['p_a1_4_2'] = { id: 'p_a1_4_2', name: 'Great-Grandson A1-4b', parentId: 'p_a1_4', childrenIds: [], generation: 4 };

  // Gen 4: Under A3-1 (5 children)
  people['p_a3_1_1'] = { id: 'p_a3_1_1', name: 'Great-Grandson A3-1a', parentId: 'p_a3_1', childrenIds: ['p_a3_1_1_gen5_1', 'p_a3_1_1_gen5_2', 'p_a3_1_1_gen5_3'], generation: 4 };
  people['p_a3_1_2'] = { id: 'p_a3_1_2', name: 'Great-Grandson A3-1b', parentId: 'p_a3_1', childrenIds: [], generation: 4 };
  people['p_a3_1_3'] = { id: 'p_a3_1_3', name: 'Great-Grandson A3-1c', parentId: 'p_a3_1', childrenIds: [], generation: 4 };
  people['p_a3_1_4'] = { id: 'p_a3_1_4', name: 'Great-Grandson A3-1d', parentId: 'p_a3_1', childrenIds: [], generation: 4 };
  people['p_a3_1_5'] = { id: 'p_a3_1_5', name: 'Great-Grandson A3-1e', parentId: 'p_a3_1', childrenIds: [], generation: 4 };

  // Gen 4: Under A3-3 (6 children)
  people['p_a3_3_1'] = { id: 'p_a3_3_1', name: 'Great-Grandson A3-3a', parentId: 'p_a3_3', childrenIds: [], generation: 4 };
  people['p_a3_3_2'] = { id: 'p_a3_3_2', name: 'Great-Grandson A3-3b', parentId: 'p_a3_3', childrenIds: [], generation: 4 };
  people['p_a3_3_3'] = { id: 'p_a3_3_3', name: 'Great-Grandson A3-3c', parentId: 'p_a3_3', childrenIds: [], generation: 4 };
  people['p_a3_3_4'] = { id: 'p_a3_3_4', name: 'Great-Grandson A3-3d', parentId: 'p_a3_3', childrenIds: [], generation: 4 };
  people['p_a3_3_5'] = { id: 'p_a3_3_5', name: 'Great-Grandson A3-3e', parentId: 'p_a3_3', childrenIds: [], generation: 4 };
  people['p_a3_3_6'] = { id: 'p_a3_3_6', name: 'Great-Grandson A3-3f', parentId: 'p_a3_3', childrenIds: [], generation: 4 };

  // Gen 5: Under A1-1a (2 descendants)
  people['p_a1_1_1_gen5_1'] = { id: 'p_a1_1_1_gen5_1', name: 'Descendant Gen 5 - 1', parentId: 'p_a1_1_1', childrenIds: [], generation: 5 };
  people['p_a1_1_1_gen5_2'] = { id: 'p_a1_1_1_gen5_2', name: 'Descendant Gen 5 - 2', parentId: 'p_a1_1_1', childrenIds: [], generation: 5 };

  // Gen 5: Under A3-1a (3 descendants)
  people['p_a3_1_1_gen5_1'] = { id: 'p_a3_1_1_gen5_1', name: 'Descendant Gen 5 - 3', parentId: 'p_a3_1_1', childrenIds: [], generation: 5 };
  people['p_a3_1_1_gen5_2'] = { id: 'p_a3_1_1_gen5_2', name: 'Descendant Gen 5 - 4', parentId: 'p_a3_1_1', childrenIds: [], generation: 5 };
  people['p_a3_1_1_gen5_3'] = { id: 'p_a3_1_1_gen5_3', name: 'Descendant Gen 5 - 5', parentId: 'p_a3_1_1', childrenIds: [], generation: 5 };

  const now = Date.now();
  return {
    id: 'tree_sample_lineage',
    title: 'Sample 5-Generation Paternal Lineage',
    rootPersonId: rootId,
    people,
    layoutMode: 'vertical',
    collapsedBranchIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

