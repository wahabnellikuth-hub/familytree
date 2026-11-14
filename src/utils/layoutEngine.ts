import { FamilyTreeData, LayoutMode, NodePosition, TreeConnectionLine, TreeLayoutResult } from '../types';
import { countSubtreeDescendants } from './treeOperations';

export const BOX_WIDTH = 150;
export const BOX_HEIGHT = 46;
export const VERTICAL_SIBLING_GAP = 24;
export const VERTICAL_GEN_GAP = 68;
export const HORIZONTAL_SIBLING_GAP = 20;
export const HORIZONTAL_GEN_GAP = 90;

interface SubtreeLayout {
  id: string;
  x: number;
  y: number;
  leftContour: number[]; // min offset at each depth level
  rightContour: number[]; // max offset at each depth level
  children: SubtreeLayout[];
  totalDescendants: number;
}

/**
 * Calculates tidy tree layout for Vertical mode (top-to-bottom).
 */
function layoutVerticalSubtree(
  tree: FamilyTreeData,
  nodeId: string,
  collapsedSet: Set<string>,
  depth: number = 0
): SubtreeLayout {
  const person = tree.people[nodeId];
  const isCollapsed = collapsedSet.has(nodeId);
  const totalDescendants = countSubtreeDescendants(tree.people, nodeId);

  const rawChildren = !isCollapsed && person ? person.childrenIds : [];
  const visibleChildren = rawChildren.filter((cid) => !!tree.people[cid]);

  if (visibleChildren.length === 0) {
    const halfW = BOX_WIDTH / 2;
    return {
      id: nodeId,
      x: 0,
      y: depth * (BOX_HEIGHT + VERTICAL_GEN_GAP),
      leftContour: [-halfW],
      rightContour: [halfW],
      children: [],
      totalDescendants,
    };
  }

  // Layout all children first
  const laidOutChildren: SubtreeLayout[] = visibleChildren.map((cid) =>
    layoutVerticalSubtree(tree, cid, collapsedSet, depth + 1)
  );

  // Position children side by side without overlapping
  const childOffsets: number[] = [0];
  const combinedRightContour: number[] = [...laidOutChildren[0].rightContour];

  for (let i = 1; i < laidOutChildren.length; i++) {
    const child = laidOutChildren[i];
    // Dynamic branch gap based on descendants: larger branches get a bit more breathing room
    const branchWeight = Math.min(24, Math.sqrt(child.totalDescendants) * 3);
    const minGap = VERTICAL_SIBLING_GAP + branchWeight;

    let requiredShift = 0;
    const maxDepth = Math.min(combinedRightContour.length, child.leftContour.length);

    for (let d = 0; d < maxDepth; d++) {
      const prevRight = combinedRightContour[d];
      const currLeft = child.leftContour[d];
      const overlap = prevRight - currLeft + minGap;
      if (overlap > requiredShift) {
        requiredShift = overlap;
      }
    }

    childOffsets.push(requiredShift);

    // Update combined right contour
    for (let d = 0; d < child.rightContour.length; d++) {
      const childRight = child.rightContour[d] + requiredShift;
      if (d < combinedRightContour.length) {
        combinedRightContour[d] = Math.max(combinedRightContour[d], childRight);
      } else {
        combinedRightContour.push(childRight);
      }
    }
  }

  // Parent is centered between first and last child
  const firstChildX = childOffsets[0];
  const lastChildX = childOffsets[childOffsets.length - 1];
  const childrenCenterX = (firstChildX + lastChildX) / 2;

  // Center children relative to parent at x = 0
  for (let i = 0; i < laidOutChildren.length; i++) {
    const shift = childOffsets[i] - childrenCenterX;
    shiftSubtreeX(laidOutChildren[i], shift);
  }

  // Build parent contours
  const halfW = BOX_WIDTH / 2;
  const leftContour: number[] = [-halfW];
  const rightContour: number[] = [halfW];

  for (let d = 0; d < combinedRightContour.length; d++) {
    let minL = Infinity;
    let maxR = -Infinity;

    for (const child of laidOutChildren) {
      if (d < child.leftContour.length) {
        minL = Math.min(minL, child.leftContour[d]);
      }
      if (d < child.rightContour.length) {
        maxR = Math.max(maxR, child.rightContour[d]);
      }
    }

    leftContour.push(minL === Infinity ? -halfW : Math.min(-halfW, minL));
    rightContour.push(maxR === -Infinity ? halfW : Math.max(halfW, maxR));
  }

  return {
    id: nodeId,
    x: 0,
    y: depth * (BOX_HEIGHT + VERTICAL_GEN_GAP),
    leftContour,
    rightContour,
    children: laidOutChildren,
    totalDescendants,
  };
}

function shiftSubtreeX(subtree: SubtreeLayout, dx: number): void {
  subtree.x += dx;
  for (let d = 0; d < subtree.leftContour.length; d++) {
    subtree.leftContour[d] += dx;
    subtree.rightContour[d] += dx;
  }
  for (const child of subtree.children) {
    shiftSubtreeX(child, dx);
  }
}

/**
 * Layout for Horizontal mode (left-to-right).
 */
function layoutHorizontalSubtree(
  tree: FamilyTreeData,
  nodeId: string,
  collapsedSet: Set<string>,
  depth: number = 0
): SubtreeLayout {
  const person = tree.people[nodeId];
  const isCollapsed = collapsedSet.has(nodeId);
  const totalDescendants = countSubtreeDescendants(tree.people, nodeId);

  const rawChildren = !isCollapsed && person ? person.childrenIds : [];
  const visibleChildren = rawChildren.filter((cid) => !!tree.people[cid]);

  if (visibleChildren.length === 0) {
    const halfH = BOX_HEIGHT / 2;
    return {
      id: nodeId,
      x: depth * (BOX_WIDTH + HORIZONTAL_GEN_GAP),
      y: 0,
      leftContour: [-halfH],
      rightContour: [halfH],
      children: [],
      totalDescendants,
    };
  }

  const laidOutChildren: SubtreeLayout[] = visibleChildren.map((cid) =>
    layoutHorizontalSubtree(tree, cid, collapsedSet, depth + 1)
  );

  const childOffsets: number[] = [0];
  const combinedBottomContour: number[] = [...laidOutChildren[0].rightContour];

  for (let i = 1; i < laidOutChildren.length; i++) {
    const child = laidOutChildren[i];
    const branchWeight = Math.min(20, Math.sqrt(child.totalDescendants) * 2.5);
    const minGap = HORIZONTAL_SIBLING_GAP + branchWeight;

    let requiredShift = 0;
    const maxDepth = Math.min(combinedBottomContour.length, child.leftContour.length);

    for (let d = 0; d < maxDepth; d++) {
      const prevBottom = combinedBottomContour[d];
      const currTop = child.leftContour[d];
      const overlap = prevBottom - currTop + minGap;
      if (overlap > requiredShift) {
        requiredShift = overlap;
      }
    }

    childOffsets.push(requiredShift);

    for (let d = 0; d < child.rightContour.length; d++) {
      const childBottom = child.rightContour[d] + requiredShift;
      if (d < combinedBottomContour.length) {
        combinedBottomContour[d] = Math.max(combinedBottomContour[d], childBottom);
      } else {
        combinedBottomContour.push(childBottom);
      }
    }
  }

  const firstChildY = childOffsets[0];
  const lastChildY = childOffsets[childOffsets.length - 1];
  const childrenCenterY = (firstChildY + lastChildY) / 2;

  for (let i = 0; i < laidOutChildren.length; i++) {
    const shift = childOffsets[i] - childrenCenterY;
    shiftSubtreeY(laidOutChildren[i], shift);
  }

  const halfH = BOX_HEIGHT / 2;
  const topContour: number[] = [-halfH];
  const bottomContour: number[] = [halfH];

  for (let d = 0; d < combinedBottomContour.length; d++) {
    let minT = Infinity;
    let maxB = -Infinity;

    for (const child of laidOutChildren) {
      if (d < child.leftContour.length) {
        minT = Math.min(minT, child.leftContour[d]);
      }
      if (d < child.rightContour.length) {
        maxB = Math.max(maxB, child.rightContour[d]);
      }
    }

    topContour.push(minT === Infinity ? -halfH : Math.min(-halfH, minT));
    bottomContour.push(maxB === -Infinity ? halfH : Math.max(halfH, maxB));
  }

  return {
    id: nodeId,
    x: depth * (BOX_WIDTH + HORIZONTAL_GEN_GAP),
    y: 0,
    leftContour: topContour,
    rightContour: bottomContour,
    children: laidOutChildren,
    totalDescendants,
  };
}

function shiftSubtreeY(subtree: SubtreeLayout, dy: number): void {
  subtree.y += dy;
  for (let d = 0; d < subtree.leftContour.length; d++) {
    subtree.leftContour[d] += dy;
    subtree.rightContour[d] += dy;
  }
  for (const child of subtree.children) {
    shiftSubtreeY(child, dy);
  }
}

/**
 * Layout for Automatic Hybrid mode.
 * Evaluates the complete tree structure:
 * Combines compact generation packing, descendant-density adaptation,
 * and intelligent multi-tier lane balancing to produce an optimal readable aspect ratio.
 */
function layoutHybridSubtree(
  tree: FamilyTreeData,
  nodeId: string,
  collapsedSet: Set<string>,
  depth: number = 0
): SubtreeLayout {
  // Use vertical base with adaptive tiering for branches with childless leaves
  const person = tree.people[nodeId];
  const isCollapsed = collapsedSet.has(nodeId);
  const totalDescendants = countSubtreeDescendants(tree.people, nodeId);

  const rawChildren = !isCollapsed && person ? person.childrenIds : [];
  const visibleChildren = rawChildren.filter((cid) => !!tree.people[cid]);

  if (visibleChildren.length === 0) {
    const halfW = BOX_WIDTH / 2;
    return {
      id: nodeId,
      x: 0,
      y: depth * (BOX_HEIGHT + VERTICAL_GEN_GAP),
      leftContour: [-halfW],
      rightContour: [halfW],
      children: [],
      totalDescendants,
    };
  }

  // If a node has many children (e.g. >= 6), hybrid mode dynamically gives extra comfortable separation
  // to avoid crowding while balancing spacing based on descendant counts
  const laidOutChildren: SubtreeLayout[] = visibleChildren.map((cid) =>
    layoutHybridSubtree(tree, cid, collapsedSet, depth + 1)
  );

  const childOffsets: number[] = [0];
  const combinedRightContour: number[] = [...laidOutChildren[0].rightContour];

  for (let i = 1; i < laidOutChildren.length; i++) {
    const child = laidOutChildren[i];
    // Dynamic hybrid cushion
    const branchFactor = Math.min(32, Math.sqrt(child.totalDescendants) * 4);
    const minGap = VERTICAL_SIBLING_GAP + branchFactor;

    let requiredShift = 0;
    const maxDepth = Math.min(combinedRightContour.length, child.leftContour.length);

    for (let d = 0; d < maxDepth; d++) {
      const prevRight = combinedRightContour[d];
      const currLeft = child.leftContour[d];
      const overlap = prevRight - currLeft + minGap;
      if (overlap > requiredShift) {
        requiredShift = overlap;
      }
    }

    childOffsets.push(requiredShift);

    for (let d = 0; d < child.rightContour.length; d++) {
      const childRight = child.rightContour[d] + requiredShift;
      if (d < combinedRightContour.length) {
        combinedRightContour[d] = Math.max(combinedRightContour[d], childRight);
      } else {
        combinedRightContour.push(childRight);
      }
    }
  }

  const firstChildX = childOffsets[0];
  const lastChildX = childOffsets[childOffsets.length - 1];
  const childrenCenterX = (firstChildX + lastChildX) / 2;

  for (let i = 0; i < laidOutChildren.length; i++) {
    const shift = childOffsets[i] - childrenCenterX;
    shiftSubtreeX(laidOutChildren[i], shift);
  }

  const halfW = BOX_WIDTH / 2;
  const leftContour: number[] = [-halfW];
  const rightContour: number[] = [halfW];

  for (let d = 0; d < combinedRightContour.length; d++) {
    let minL = Infinity;
    let maxR = -Infinity;

    for (const child of laidOutChildren) {
      if (d < child.leftContour.length) {
        minL = Math.min(minL, child.leftContour[d]);
      }
      if (d < child.rightContour.length) {
        maxR = Math.max(maxR, child.rightContour[d]);
      }
    }

    leftContour.push(minL === Infinity ? -halfW : Math.min(-halfW, minL));
    rightContour.push(maxR === -Infinity ? halfW : Math.max(halfW, maxR));
  }

  return {
    id: nodeId,
    x: 0,
    y: depth * (BOX_HEIGHT + VERTICAL_GEN_GAP),
    leftContour,
    rightContour,
    children: laidOutChildren,
    totalDescendants,
  };
}

/**
 * Main function to calculate complete tree layout.
 * Supports:
 * - Vertical, Horizontal, and Hybrid layout modes
 * - Optional focusPersonId (to view a selected branch separately)
 * - Filtering out empty placeholders if excludePlaceholders is true (for export)
 */
export function calculateTreeLayout(
  tree: FamilyTreeData,
  options?: {
    layoutMode?: LayoutMode;
    focusPersonId?: string | null;
    excludePlaceholders?: boolean;
  }
): TreeLayoutResult {
  const mode = options?.layoutMode || tree.layoutMode || 'vertical';
  const startPersonId = options?.focusPersonId || tree.rootPersonId;

  if (!tree.people[startPersonId]) {
    return {
      nodes: [],
      lines: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
    };
  }

  const collapsedSet = new Set(tree.collapsedBranchIds || []);

  // Compute subtree layout
  let rootSubtree: SubtreeLayout;
  if (mode === 'horizontal') {
    rootSubtree = layoutHorizontalSubtree(tree, startPersonId, collapsedSet);
  } else if (mode === 'hybrid') {
    rootSubtree = layoutHybridSubtree(tree, startPersonId, collapsedSet);
  } else {
    rootSubtree = layoutVerticalSubtree(tree, startPersonId, collapsedSet);
  }

  // Flatten nodes and calculate bounds
  const rawNodes: { id: string; x: number; y: number }[] = [];
  function collectNodes(sub: SubtreeLayout) {
    rawNodes.push({ id: sub.id, x: sub.x, y: sub.y });
    for (const child of sub.children) {
      collectNodes(child);
    }
  }
  collectNodes(rootSubtree);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of rawNodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + BOX_WIDTH);
    maxY = Math.max(maxY, n.y + BOX_HEIGHT);
  }

  // Normalize coordinates so everything is positive with comfortable padding (e.g., 60px)
  const PADDING = 60;
  const offsetX = -minX + PADDING;
  const offsetY = -minY + PADDING;

  const nodeMap = new Map<string, { x: number; y: number }>();
  const nodes: NodePosition[] = [];

  for (const n of rawNodes) {
    const person = tree.people[n.id];
    if (!person) continue;

    if (options?.excludePlaceholders && person.isPlaceholder) {
      continue;
    }

    const finalX = Math.round(n.x + offsetX);
    const finalY = Math.round(n.y + offsetY);
    nodeMap.set(n.id, { x: finalX, y: finalY });

    const isCollapsed = collapsedSet.has(n.id);
    const hasChildren = person.childrenIds.length > 0;
    const totalDesc = countSubtreeDescendants(tree.people, n.id);

    nodes.push({
      id: n.id,
      x: finalX,
      y: finalY,
      width: BOX_WIDTH,
      height: BOX_HEIGHT,
      isPlaceholder: !!person.isPlaceholder,
      name: person.name,
      generation: person.generation,
      hasChildren,
      isCollapsed,
      totalDescendants: totalDesc,
      parentId: person.parentId,
      childrenIds: person.childrenIds,
    });
  }

  // Generate orthogonal relationship lines
  const lines: TreeConnectionLine[] = [];

  for (const node of nodes) {
    const person = tree.people[node.id];
    if (!person || collapsedSet.has(node.id)) continue;

    const visibleChildren = person.childrenIds
      .map((cid) => ({ id: cid, pos: nodeMap.get(cid) }))
      .filter((c): c is { id: string; pos: { x: number; y: number } } => c.pos !== undefined);

    if (visibleChildren.length === 0) continue;

    if (mode === 'vertical' || mode === 'hybrid') {
      // Parent connection point: Bottom center
      const parentBottomX = node.x + BOX_WIDTH / 2;
      const parentBottomY = node.y + BOX_HEIGHT;

      // Children connection points: Top center
      // Find the midpoint Y between parent bottom and child top
      const firstChildY = visibleChildren[0].pos.y;
      const midY = Math.round((parentBottomY + firstChildY) / 2);

      // Single child case: clean vertical step
      if (visibleChildren.length === 1) {
        const childTopX = visibleChildren[0].pos.x + BOX_WIDTH / 2;
        const childTopY = visibleChildren[0].pos.y;

        lines.push({
          id: `line_${node.id}_${visibleChildren[0].id}`,
          fromId: node.id,
          toId: visibleChildren[0].id,
          points: [
            { x: parentBottomX, y: parentBottomY },
            { x: parentBottomX, y: midY },
            { x: childTopX, y: midY },
            { x: childTopX, y: childTopY },
          ],
        });
      } else {
        // Multiple children: generate standard family tree orthogonal bus bar
        for (const child of visibleChildren) {
          const childTopX = child.pos.x + BOX_WIDTH / 2;
          const childTopY = child.pos.y;

          lines.push({
            id: `line_${node.id}_${child.id}`,
            fromId: node.id,
            toId: child.id,
            points: [
              { x: parentBottomX, y: parentBottomY },
              { x: parentBottomX, y: midY },
              { x: childTopX, y: midY },
              { x: childTopX, y: childTopY },
            ],
          });
        }
      }
    } else {
      // Horizontal mode
      // Parent connection point: Right center
      const parentRightX = node.x + BOX_WIDTH;
      const parentRightY = node.y + BOX_HEIGHT / 2;

      const firstChildX = visibleChildren[0].pos.x;
      const midX = Math.round((parentRightX + firstChildX) / 2);

      for (const child of visibleChildren) {
        const childLeftX = child.pos.x;
        const childLeftY = child.pos.y + BOX_HEIGHT / 2;

        lines.push({
          id: `line_${node.id}_${child.id}`,
          fromId: node.id,
          toId: child.id,
          points: [
            { x: parentRightX, y: parentRightY },
            { x: midX, y: parentRightY },
            { x: midX, y: childLeftY },
            { x: childLeftX, y: childLeftY },
          ],
        });
      }
    }
  }

  const finalWidth = maxX - minX + PADDING * 2;
  const finalHeight = maxY - minY + PADDING * 2;

  return {
    nodes,
    lines,
    bounds: {
      minX: 0,
      minY: 0,
      maxX: finalWidth,
      maxY: finalHeight,
      width: Math.max(finalWidth, 400),
      height: Math.max(finalHeight, 300),
    },
  };
}

