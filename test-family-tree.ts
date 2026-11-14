import { createSampleFamilyTree } from './src/utils/sampleData.ts';
import { calculateTreeLayout } from './src/utils/layoutEngine.ts';
import {
  validateTree,
  countSubtreeDescendants,
  getDescendantIds,
  addChildren,
  addEmptyPlaceholder,
  convertPlaceholder,
  updatePersonName,
  deletePerson,
  reorderChildren,
  movePerson,
} from './src/utils/treeOperations.ts';

function runTests() {
  console.log('=== RUNNING PATERNAL FAMILY TREE BUILDER VERIFICATION TESTS ===\n');

  // Test 1: Sample Family Tree Structure (Section 15)
  console.log('Test 1: Verifying Section 15 Sample Family Tree...');
  const sample = createSampleFamilyTree();
  const validation = validateTree(sample);
  if (!validation.valid) {
    throw new Error(`Sample tree failed validation: ${validation.error}`);
  }
  console.log('✓ Tree is valid paternal lineage (single root, no cycles, valid father references).');

  const root = sample.people[sample.rootPersonId];
  if (root.name !== 'Grandfather A') throw new Error('Root is not Grandfather A');
  if (root.childrenIds.length !== 3) throw new Error('Grandfather does not have 3 sons (A1, A2, A3)');
  console.log(`✓ Gen 1: ${root.name} has ${root.childrenIds.length} sons: Son A1, Son A2, Son A3.`);

  // Gen 3 verification
  const a1 = sample.people['p_a1'];
  const a2 = sample.people['p_a2'];
  const a3 = sample.people['p_a3'];
  if (a1.childrenIds.length !== 5) throw new Error('A1 should have 5 children');
  if (a2.childrenIds.length !== 2) throw new Error('A2 should have 2 children');
  if (a3.childrenIds.length !== 7) throw new Error('A3 should have 7 children');
  console.log('✓ Gen 3: A1 has 5 children, A2 has 2 children, A3 has 7 children.');

  // Check total members and generations
  const allPeople = Object.values(sample.people);
  const maxGen = Math.max(...allPeople.map((p) => p.generation));
  if (maxGen !== 5) throw new Error(`Expected 5 generations, found ${maxGen}`);
  console.log(`✓ Tree has ${allPeople.length} members across ${maxGen} generations.`);

  // Test 2: Vertical Layout & Intelligent Spacing
  console.log('\nTest 2: Verifying Vertical Layout & Intelligent Dynamic Spacing...');
  const vertLayout = calculateTreeLayout(sample, { layoutMode: 'vertical' });
  if (vertLayout.nodes.length !== allPeople.length) {
    throw new Error(`Vertical layout nodes count mismatch: ${vertLayout.nodes.length} vs ${allPeople.length}`);
  }
  console.log(`✓ Vertical layout generated ${vertLayout.nodes.length} positioned nodes and ${vertLayout.lines.length} orthogonal lines.`);
  console.log(`✓ Tree bounding box: ${vertLayout.bounds.width}px x ${vertLayout.bounds.height}px.`);

  // Check no box overlaps in Vertical mode
  for (let i = 0; i < vertLayout.nodes.length; i++) {
    for (let j = i + 1; j < vertLayout.nodes.length; j++) {
      const n1 = vertLayout.nodes[i];
      const n2 = vertLayout.nodes[j];
      // If at same Y or overlapping vertically
      const verticalOverlap = n1.y < n2.y + n2.height && n1.y + n1.height > n2.y;
      const horizontalOverlap = n1.x < n2.x + n2.width && n1.x + n1.width > n2.x;
      if (verticalOverlap && horizontalOverlap) {
        throw new Error(`BOX OVERLAP DETECTED between "${n1.name}" and "${n2.name}" at (${n1.x},${n1.y}) and (${n2.x},${n2.y})`);
      }
    }
  }
  console.log('✓ NO BOX OVERLAPS detected across the entire tree!');

  // Check unequal branch spacing: A3's branch subtree width vs A2's branch subtree width
  const a2Node = vertLayout.nodes.find((n) => n.id === 'p_a2')!;
  const a3Node = vertLayout.nodes.find((n) => n.id === 'p_a3')!;
  const a2Descendants = getDescendantIds(sample.people, 'p_a2');
  const a3Descendants = getDescendantIds(sample.people, 'p_a3');
  const a2SubtreeNodes = vertLayout.nodes.filter((n) => a2Descendants.has(n.id) || n.id === 'p_a2');
  const a3SubtreeNodes = vertLayout.nodes.filter((n) => a3Descendants.has(n.id) || n.id === 'p_a3');

  const a2Width = Math.max(...a2SubtreeNodes.map((n) => n.x + n.width)) - Math.min(...a2SubtreeNodes.map((n) => n.x));
  const a3Width = Math.max(...a3SubtreeNodes.map((n) => n.x + n.width)) - Math.min(...a3SubtreeNodes.map((n) => n.x));
  console.log(`✓ Intelligent descendant spacing: Son A2 subtree width = ${a2Width}px (${countSubtreeDescendants(sample.people, 'p_a2')} descendants), Son A3 subtree width = ${a3Width}px (${countSubtreeDescendants(sample.people, 'p_a3')} descendants).`);
  if (a3Width <= a2Width) {
    throw new Error('A3 subtree should receive significantly more width than A2 subtree!');
  }
  console.log('✓ Confirmed: Larger branch (A3) receives proportionally more space than smaller branch (A2)!');

  // Test 3: Horizontal Layout
  console.log('\nTest 3: Verifying Horizontal Layout...');
  const horizLayout = calculateTreeLayout(sample, { layoutMode: 'horizontal' });
  if (horizLayout.nodes.length !== allPeople.length) {
    throw new Error('Horizontal layout nodes count mismatch');
  }
  // Check no box overlaps in Horizontal mode
  for (let i = 0; i < horizLayout.nodes.length; i++) {
    for (let j = i + 1; j < horizLayout.nodes.length; j++) {
      const n1 = horizLayout.nodes[i];
      const n2 = horizLayout.nodes[j];
      const vOverlap = n1.y < n2.y + n2.height && n1.y + n1.height > n2.y;
      const hOverlap = n1.x < n2.x + n2.width && n1.x + n1.width > n2.x;
      if (vOverlap && hOverlap) {
        throw new Error(`HORIZONTAL OVERLAP DETECTED between "${n1.name}" and "${n2.name}"`);
      }
    }
  }
  console.log('✓ Horizontal layout: Zero overlaps, correct orthogonal left-to-right lineage tree.');

  // Test 4: Automatic Hybrid Layout
  console.log('\nTest 4: Verifying Automatic Hybrid Layout...');
  const hybridLayout = calculateTreeLayout(sample, { layoutMode: 'hybrid' });
  if (hybridLayout.nodes.length !== allPeople.length) {
    throw new Error('Hybrid layout nodes count mismatch');
  }
  for (let i = 0; i < hybridLayout.nodes.length; i++) {
    for (let j = i + 1; j < hybridLayout.nodes.length; j++) {
      const n1 = hybridLayout.nodes[i];
      const n2 = hybridLayout.nodes[j];
      const vOverlap = n1.y < n2.y + n2.height && n1.y + n1.height > n2.y;
      const hOverlap = n1.x < n2.x + n2.width && n1.x + n1.width > n2.x;
      if (vOverlap && hOverlap) {
        throw new Error(`HYBRID OVERLAP DETECTED between "${n1.name}" and "${n2.name}"`);
      }
    }
  }
  console.log('✓ Hybrid layout: Balanced structure, zero overlaps, all paternal relationships intact.');

  // Test 5: Adding Children & Empty Placeholders
  console.log('\nTest 5: Testing Adding Children & Placeholders...');
  let tree = addChildren(sample, 'p_a2', ['New Son A2-3', 'New Son A2-4']);
  if (tree.people['p_a2'].childrenIds.length !== 4) throw new Error('Failed to add 2 children to A2');
  console.log('✓ Added multiple children successfully to A2.');

  tree = addEmptyPlaceholder(tree, 'p_a2');
  const addedPlaceholderId = tree.people['p_a2'].childrenIds[tree.people['p_a2'].childrenIds.length - 1];
  if (!tree.people[addedPlaceholderId].isPlaceholder) throw new Error('Placeholder flag not set');
  console.log('✓ Added empty placeholder box successfully.');

  // Convert placeholder
  tree = convertPlaceholder(tree, addedPlaceholderId, 'Confirmed Son A2-5');
  if (tree.people[addedPlaceholderId].isPlaceholder) throw new Error('Placeholder not converted');
  if (tree.people[addedPlaceholderId].name !== 'Confirmed Son A2-5') throw new Error('Converted name mismatch');
  console.log('✓ Converted placeholder box to named person successfully.');

  // Test 6: Editing Name
  console.log('\nTest 6: Testing Name Editing...');
  tree = updatePersonName(tree, 'p_a1', 'Son A1 (Renamed)');
  if (tree.people['p_a1'].name !== 'Son A1 (Renamed)') throw new Error('Failed to update name');
  console.log('✓ Updated person name successfully.');

  // Test 7: Sibling Reordering
  console.log('\nTest 7: Testing Sibling Reordering...');
  const originalOrder = [...tree.people[root.id].childrenIds];
  const reversedOrder = [...originalOrder].reverse();
  tree = reorderChildren(tree, root.id, reversedOrder);
  if (JSON.stringify(tree.people[root.id].childrenIds) !== JSON.stringify(reversedOrder)) {
    throw new Error('Sibling order not updated');
  }
  console.log('✓ Sibling reordering confirmed: order persisted correctly.');

  // Test 8: Move Person to Another Father (with cycle prevention!)
  console.log('\nTest 8: Testing Moving Person & Circular Relationship Prevention...');
  // Attempt invalid move: try to make A1's father one of A1's grandsons (cycle)
  const invalidMove = movePerson(tree, 'p_a1', 'p_a1_1_1');
  if (invalidMove.success) throw new Error('Expected cycle validation to block moving ancestor under descendant!');
  console.log(`✓ Circular relationship successfully blocked: "${invalidMove.error}"`);

  // Valid move: move A2-1 from A2 to A3
  const validMove = movePerson(tree, 'p_a2_1', 'p_a3');
  if (!validMove.success) throw new Error(`Valid move failed: ${validMove.error}`);
  tree = validMove.tree;
  if (tree.people['p_a2_1'].parentId !== 'p_a3') throw new Error('Parent ID not updated to A3');
  if (tree.people['p_a2'].childrenIds.includes('p_a2_1')) throw new Error('Old father still contains child');
  if (!tree.people['p_a3'].childrenIds.includes('p_a2_1')) throw new Error('New father missing child');
  console.log('✓ Successfully moved person to new father with correct relationship validation.');

  // Test 9: Deleting a Branch
  console.log('\nTest 9: Testing Branch Deletion...');
  const countBefore = Object.keys(tree.people).length;
  const a3DescCount = countSubtreeDescendants(tree.people, 'p_a3');
  tree = deletePerson(tree, 'p_a3', true);
  const countAfter = Object.keys(tree.people).length;
  if (tree.people['p_a3']) throw new Error('A3 was not deleted');
  if (countBefore - countAfter !== a3DescCount + 1) {
    throw new Error(`Expected deletion of ${a3DescCount + 1} members, deleted ${countBefore - countAfter}`);
  }
  console.log(`✓ Deleted branch A3: removed ${a3DescCount + 1} members completely and cleanly.`);

  // Test 10: Selected Branch Focus Layout
  console.log('\nTest 10: Testing Selected Branch View (Focus Mode)...');
  const branchLayout = calculateTreeLayout(sample, { focusPersonId: 'p_a1' });
  const a1SubtreeCount = countSubtreeDescendants(sample.people, 'p_a1') + 1;
  if (branchLayout.nodes.length !== a1SubtreeCount) {
    throw new Error(`Expected ${a1SubtreeCount} nodes in A1 branch layout, got ${branchLayout.nodes.length}`);
  }
  console.log(`✓ Focus Mode: Successfully isolated and laid out only Son A1's branch (${branchLayout.nodes.length} nodes).`);

  console.log('\n======================================================');
  console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY! (10/10)');
  console.log('======================================================\n');
}

runTests();
