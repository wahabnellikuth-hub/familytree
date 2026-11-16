import { FamilyTreeData, LayoutMode, NodePosition, TreeConnectionLine, TreeLayoutResult, BranchDirection } from '../types';
import { countSubtreeDescendants, sanitizeTreeData } from './treeOperations';

export const BASE_BOX_WIDTH = 132;
export const BASE_BOX_HEIGHT = 36;
export const VERTICAL_SIBLING_GAP = 12;
export const VERTICAL_GEN_GAP = 30;
export const HORIZONTAL_SIBLING_GAP = 12;
export const HORIZONTAL_GEN_GAP = 32;

/**
 * Computes dynamic box dimensions so that the person's name and details
 * fit completely inside the box without any dots "..." (no ellipsis/truncation).
 */
export function computeNodeDimensions(
  name: string,
  isPlaceholder?: boolean,
  extraNote?: string
): { width: number; height: number; lines: string[]; noteLines?: string[] } {
  const text = (name || (isPlaceholder ? 'Empty Box (Reserved)' : 'Unnamed')).trim();
  const words = text.split(/\s+/);

  let nameW = BASE_BOX_WIDTH;
  let nameH = BASE_BOX_HEIGHT;
  let lines: string[] = [text];

  // Short single or 2-word names: base dimensions
  if (text.length > 15 && words.length > 1) {
    const wrapped: string[] = [];
    let currentLine = '';
    const targetLineChars = text.length > 30 ? Math.ceil(text.length / 3) : Math.ceil(text.length / 2);
    const maxLineChars = Math.max(14, targetLineChars);

    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else if ((currentLine + ' ' + word).length <= maxLineChars) {
        currentLine += ' ' + word;
      } else {
        wrapped.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) wrapped.push(currentLine);
    lines = wrapped;
    const longestLineLen = Math.max(...lines.map((l) => l.length));
    nameW = Math.min(260, Math.max(BASE_BOX_WIDTH, Math.round(longestLineLen * 8.5 + 20)));
    nameH = Math.max(BASE_BOX_HEIGHT, lines.length * 16 + 8);
  } else if (text.length > 15) {
    nameW = Math.min(280, Math.max(BASE_BOX_WIDTH, Math.round(text.length * 8.5 + 20)));
  }

  // Handle extra note breaking line and text
  let noteLines: string[] | undefined = undefined;
  if (extraNote && extraNote.trim()) {
    const noteText = extraNote.trim();
    const noteWords = noteText.split(/\s+/);
    noteLines = [];
    let currentNoteLine = '';
    const maxNoteChars = 20;

    for (const word of noteWords) {
      if (!currentNoteLine) {
        currentNoteLine = word;
      } else if ((currentNoteLine + ' ' + word).length <= maxNoteChars) {
        currentNoteLine += ' ' + word;
      } else {
        noteLines.push(currentNoteLine);
        currentNoteLine = word;
      }
    }
    if (currentNoteLine) noteLines.push(currentNoteLine);

    const longestNoteLen = Math.max(...noteLines.map((l) => l.length));
    const noteW = Math.min(260, Math.max(nameW, Math.round(longestNoteLen * 7.5 + 20)));
    nameW = Math.max(nameW, noteW);
    nameH += noteLines.length * 14 + 10; // Breaking line + note height
  }

  return { width: nameW, height: nameH, lines, noteLines };
}

interface SubtreeLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  leftContour: number[]; // min offset at each depth level
  rightContour: number[]; // max offset at each depth level
  children: SubtreeLayout[];
  totalDescendants: number;
  branchDirection: BranchDirection;
  isVerticallyStackedChildren?: boolean;
}

/**
 * Resolves effective branch orientation for a father's children.
 */
function resolveChildrenDirection(
  nodeBranchDir: BranchDirection | undefined,
  globalMode: LayoutMode
): 'horizontal' | 'vertical' | 'rays' | 'spine-right' | 'spine-left' | 'alternating' {
  if (nodeBranchDir === 'vertical') return 'vertical';
  if (nodeBranchDir === 'horizontal') return 'horizontal';
  if (nodeBranchDir === 'rays') return 'rays';
  if (nodeBranchDir === 'staggered' || nodeBranchDir === 'spine-right') return 'spine-right';
  if (nodeBranchDir === 'spine-left') return 'spine-left';
  if (nodeBranchDir === 'alternating') return 'alternating';
  // Inherit from global mode: in vertical/hybrid mode, default sibling expansion is horizontal; in horizontal mode, vertical.
  return globalMode === 'horizontal' ? 'vertical' : 'horizontal';
}

/**
 * Lays out a subtree rooted at nodeId in Vertical/Hybrid tree context,
 * supporting per-father mixed orientation (some father's sons horizontal, some vertical).
 */
function layoutSubtreeFlexible(
  tree: FamilyTreeData,
  nodeId: string,
  collapsedSet: Set<string>,
  globalMode: LayoutMode,
  depth: number = 0
): SubtreeLayout {
  const person = tree.people[nodeId];
  const isCollapsed = collapsedSet.has(nodeId);
  const totalDescendants = countSubtreeDescendants(tree.people, nodeId);

  // Compute dynamic box dimensions
  const dims = computeNodeDimensions(person?.name || '', person?.isPlaceholder, person?.extraNote);
  const halfW = dims.width / 2;

  const rawChildren = !isCollapsed && person && Array.isArray(person.childrenIds) ? person.childrenIds : [];
  const visibleChildren = rawChildren.filter((cid) => !!tree.people[cid]);

  if (visibleChildren.length === 0) {
    return {
      id: nodeId,
      x: 0,
      y: depth * (BASE_BOX_HEIGHT + VERTICAL_GEN_GAP),
      width: dims.width,
      height: dims.height,
      leftContour: [-halfW],
      rightContour: [halfW],
      children: [],
      totalDescendants,
      branchDirection: person?.branchDirection || 'inherit',
    };
  }

  // Determine how this father wants his direct children arranged
  const childrenDir = resolveChildrenDirection(person?.branchDirection, globalMode);

  // Recursively lay out all children
  const laidOutChildren: SubtreeLayout[] = visibleChildren.map((cid) =>
    layoutSubtreeFlexible(tree, cid, collapsedSet, globalMode, depth + 1)
  );

  const parentY = depth * (BASE_BOX_HEIGHT + VERTICAL_GEN_GAP);
  const parentBottomY = parentY + dims.height;
  const parentCenterY = parentY + dims.height / 2;

  if (childrenDir === 'rays') {
    // -------------------------------------------------------------
    // SUN RAYS / RIGHT-SIDE HORIZONTAL FAN (Upper, Straight, Below)
    // Arranges sons tightly from the right side of father's box
    // -------------------------------------------------------------
    const childLeftTargetX = halfW + 22; // Compact 22px ray arm
    const childHeights = laidOutChildren.map((c) => getSubtreeBoundingBox(c).height);
    const totalSubtreeH = childHeights.reduce((a, b) => a + b, 0) + (laidOutChildren.length - 1) * 10;
    let currentTopY = parentCenterY - totalSubtreeH / 2;
    let maxChildSubtreeRight = halfW;

    for (let i = 0; i < laidOutChildren.length; i++) {
      const child = laidOutChildren[i];
      const bbox = getSubtreeBoundingBox(child);
      shiftSubtreeX(child, childLeftTargetX + child.width / 2);
      shiftSubtreeY(child, currentTopY - bbox.minY);

      currentTopY += bbox.height + 10;
      const newBBox = getSubtreeBoundingBox(child);
      maxChildSubtreeRight = Math.max(maxChildSubtreeRight, newBBox.maxX);
    }

    const leftContour: number[] = [-halfW, -halfW];
    const rightContour: number[] = [maxChildSubtreeRight, maxChildSubtreeRight];

    return {
      id: nodeId,
      x: 0,
      y: parentY,
      width: dims.width,
      height: dims.height,
      leftContour,
      rightContour,
      children: laidOutChildren,
      totalDescendants,
      branchDirection: person?.branchDirection || 'inherit',
      isVerticallyStackedChildren: false,
    };
  } else if (childrenDir === 'spine-right') {
    // -------------------------------------------------------------
    // RIGHT SPINE / COMB RIGHT (matches user sketch)
    // Vertical line drops straight down from father, all sons to the right
    // -------------------------------------------------------------
    let currentTopY = parentBottomY + 16;
    let maxChildSubtreeRight = halfW;

    for (let i = 0; i < laidOutChildren.length; i++) {
      const child = laidOutChildren[i];
      const bbox = getSubtreeBoundingBox(child);
      // Trunk line drops at x = 0. Sons indented 14px to the right of trunk.
      shiftSubtreeX(child, 14 + child.width / 2);
      shiftSubtreeY(child, currentTopY - bbox.minY);

      const newBBox = getSubtreeBoundingBox(child);
      currentTopY = newBBox.maxY + 10;
      maxChildSubtreeRight = Math.max(maxChildSubtreeRight, newBBox.maxX);
    }

    const leftContour: number[] = [-halfW, 0];
    const rightContour: number[] = [halfW, maxChildSubtreeRight];

    return {
      id: nodeId,
      x: 0,
      y: parentY,
      width: dims.width,
      height: dims.height,
      leftContour,
      rightContour,
      children: laidOutChildren,
      totalDescendants,
      branchDirection: person?.branchDirection || 'inherit',
      isVerticallyStackedChildren: true,
    };
  } else if (childrenDir === 'spine-left') {
    // -------------------------------------------------------------
    // LEFT SPINE / COMB LEFT
    // Vertical line drops straight down from father, all sons to the left
    // -------------------------------------------------------------
    let currentTopY = parentBottomY + 16;
    let minChildSubtreeLeft = -halfW;

    for (let i = 0; i < laidOutChildren.length; i++) {
      const child = laidOutChildren[i];
      const bbox = getSubtreeBoundingBox(child);
      // Trunk line drops at x = 0. Sons indented 14px to the left of trunk.
      shiftSubtreeX(child, -14 - child.width / 2);
      shiftSubtreeY(child, currentTopY - bbox.minY);

      const newBBox = getSubtreeBoundingBox(child);
      currentTopY = newBBox.maxY + 10;
      minChildSubtreeLeft = Math.min(minChildSubtreeLeft, newBBox.minX);
    }

    const leftContour: number[] = [-halfW, minChildSubtreeLeft];
    const rightContour: number[] = [halfW, 0];

    return {
      id: nodeId,
      x: 0,
      y: parentY,
      width: dims.width,
      height: dims.height,
      leftContour,
      rightContour,
      children: laidOutChildren,
      totalDescendants,
      branchDirection: person?.branchDirection || 'inherit',
      isVerticallyStackedChildren: true,
    };
  } else if (childrenDir === 'alternating') {
    // -------------------------------------------------------------
    // ALTERNATING FISHBONE SPINE (Left & Right alternating)
    // -------------------------------------------------------------
    let currentTopY = parentBottomY + 16;
    let minChildSubtreeLeft = -halfW;
    let maxChildSubtreeRight = halfW;

    for (let i = 0; i < laidOutChildren.length; i++) {
      const child = laidOutChildren[i];
      const bbox = getSubtreeBoundingBox(child);
      const isRight = i % 2 === 0;
      const targetX = isRight ? (14 + child.width / 2) : (-14 - child.width / 2);
      shiftSubtreeX(child, targetX);
      shiftSubtreeY(child, currentTopY - bbox.minY);

      const newBBox = getSubtreeBoundingBox(child);
      currentTopY = newBBox.maxY + 10;
      minChildSubtreeLeft = Math.min(minChildSubtreeLeft, newBBox.minX);
      maxChildSubtreeRight = Math.max(maxChildSubtreeRight, newBBox.maxX);
    }

    const leftContour: number[] = [-halfW, minChildSubtreeLeft];
    const rightContour: number[] = [halfW, maxChildSubtreeRight];

    return {
      id: nodeId,
      x: 0,
      y: parentY,
      width: dims.width,
      height: dims.height,
      leftContour,
      rightContour,
      children: laidOutChildren,
      totalDescendants,
      branchDirection: person?.branchDirection || 'inherit',
      isVerticallyStackedChildren: true,
    };
  } else if (childrenDir === 'vertical') {
    // -------------------------------------------------------------
    // VERTICAL SIBLING STACK (Column of brothers under this father)
    // -------------------------------------------------------------
    let currentTopY = parentBottomY + VERTICAL_GEN_GAP;
    let maxChildSubtreeRight = halfW;
    let minChildSubtreeLeft = -halfW;

    for (let i = 0; i < laidOutChildren.length; i++) {
      const child = laidOutChildren[i];
      const bbox = getSubtreeBoundingBox(child);
      shiftSubtreeX(child, 0);
      shiftSubtreeY(child, currentTopY - bbox.minY);

      const newBBox = getSubtreeBoundingBox(child);
      currentTopY = newBBox.maxY + 10;
      minChildSubtreeLeft = Math.min(minChildSubtreeLeft, newBBox.minX);
      maxChildSubtreeRight = Math.max(maxChildSubtreeRight, newBBox.maxX);
    }

    // Build contours
    const leftContour: number[] = [-halfW, minChildSubtreeLeft];
    const rightContour: number[] = [halfW, maxChildSubtreeRight];

    return {
      id: nodeId,
      x: 0,
      y: parentY,
      width: dims.width,
      height: dims.height,
      leftContour,
      rightContour,
      children: laidOutChildren,
      totalDescendants,
      branchDirection: person?.branchDirection || 'inherit',
      isVerticallyStackedChildren: true,
    };
  } else {
    // -------------------------------------------------------------
    // HORIZONTAL SIBLING ARRANGEMENT (Side-by-side)
    // -------------------------------------------------------------
    const targetChildrenY = parentBottomY + VERTICAL_GEN_GAP;
    for (const child of laidOutChildren) {
      const diffY = targetChildrenY - child.y;
      if (diffY !== 0) {
        shiftSubtreeY(child, diffY);
      }
    }

    const childOffsets: number[] = [0];
    const combinedRightContour: number[] = [...laidOutChildren[0].rightContour];

    for (let i = 1; i < laidOutChildren.length; i++) {
      const child = laidOutChildren[i];
      const prevChild = laidOutChildren[i - 1];
      const branchWeight = Math.min(8, Math.sqrt(child.totalDescendants) * 1.0);
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

      // Also ensure boxes themselves have at least minGap separation
      const boxClearance = prevChild.width / 2 + child.width / 2 + minGap;
      if (childOffsets[i - 1] + boxClearance > requiredShift) {
        requiredShift = childOffsets[i - 1] + boxClearance;
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

    // Center children relative to father at x = 0
    const firstChildX = childOffsets[0];
    const lastChildX = childOffsets[childOffsets.length - 1];
    const childrenCenterX = (firstChildX + lastChildX) / 2;

    for (let i = 0; i < laidOutChildren.length; i++) {
      const shift = childOffsets[i] - childrenCenterX;
      shiftSubtreeX(laidOutChildren[i], shift);
    }

    // Build parent contours
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
      y: parentY,
      width: dims.width,
      height: dims.height,
      leftContour,
      rightContour,
      children: laidOutChildren,
      totalDescendants,
      branchDirection: person?.branchDirection || 'inherit',
      isVerticallyStackedChildren: false,
    };
  }
}

/**
 * Lays out tree in global Horizontal mode (Root on left, lineage expanding rightward).
 */
function layoutSubtreeHorizontal(
  tree: FamilyTreeData,
  nodeId: string,
  collapsedSet: Set<string>,
  depth: number = 0
): SubtreeLayout {
  const person = tree.people[nodeId];
  const isCollapsed = collapsedSet.has(nodeId);
  const totalDescendants = countSubtreeDescendants(tree.people, nodeId);

  const dims = computeNodeDimensions(person?.name || '', person?.isPlaceholder, person?.extraNote);
  const halfH = dims.height / 2;

  const rawChildren = !isCollapsed && person && Array.isArray(person.childrenIds) ? person.childrenIds : [];
  const visibleChildren = rawChildren.filter((cid) => !!tree.people[cid]);

  if (visibleChildren.length === 0) {
    return {
      id: nodeId,
      x: depth * (BASE_BOX_WIDTH + HORIZONTAL_GEN_GAP),
      y: 0,
      width: dims.width,
      height: dims.height,
      leftContour: [-halfH],
      rightContour: [halfH],
      children: [],
      totalDescendants,
      branchDirection: person?.branchDirection || 'inherit',
    };
  }

  const laidOutChildren: SubtreeLayout[] = visibleChildren.map((cid) =>
    layoutSubtreeHorizontal(tree, cid, collapsedSet, depth + 1)
  );

  const childOffsets: number[] = [0];
  const combinedBottomContour: number[] = [...laidOutChildren[0].rightContour];

  for (let i = 1; i < laidOutChildren.length; i++) {
    const child = laidOutChildren[i];
    const prevChild = laidOutChildren[i - 1];
    const branchWeight = Math.min(8, Math.sqrt(child.totalDescendants) * 1.0);
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

    const boxClearance = prevChild.height / 2 + child.height / 2 + minGap;
    if (childOffsets[i - 1] + boxClearance > requiredShift) {
      requiredShift = childOffsets[i - 1] + boxClearance;
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
    x: depth * (BASE_BOX_WIDTH + HORIZONTAL_GEN_GAP),
    y: 0,
    width: dims.width,
    height: dims.height,
    leftContour: topContour,
    rightContour: bottomContour,
    children: laidOutChildren,
    totalDescendants,
    branchDirection: person?.branchDirection || 'inherit',
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

function getSubtreeBoundingBox(subtree: SubtreeLayout): { minX: number; maxX: number; minY: number; maxY: number; height: number; width: number } {
  let minX = subtree.x - subtree.width / 2;
  let maxX = subtree.x + subtree.width / 2;
  let minY = subtree.y;
  let maxY = subtree.y + subtree.height;

  for (const child of subtree.children) {
    const childBox = getSubtreeBoundingBox(child);
    minX = Math.min(minX, childBox.minX);
    maxX = Math.max(maxX, childBox.maxX);
    minY = Math.min(minY, childBox.minY);
    maxY = Math.max(maxY, childBox.maxY);
  }

  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Main function to calculate complete tree layout.
 * Supports:
 * - Dynamic box sizing (no text truncation, no dots "...")
 * - Mixed per-father arrangement (some sons horizontal, some vertical)
 * - Complete orthogonal relationship connectors
 */
export function calculateTreeLayout(
  tree: FamilyTreeData,
  options?: {
    layoutMode?: LayoutMode;
    focusPersonId?: string | null;
    excludePlaceholders?: boolean;
  }
): TreeLayoutResult {
  const safeTree = sanitizeTreeData(tree);
  const mode = options?.layoutMode || safeTree.layoutMode || 'vertical';
  const startPersonId = options?.focusPersonId || safeTree.rootPersonId;

  if (!safeTree.people[startPersonId]) {
    return {
      nodes: [],
      lines: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
    };
  }

  const collapsedSet = new Set(safeTree.collapsedBranchIds || []);

  let rootSubtree: SubtreeLayout;
  if (mode === 'horizontal') {
    rootSubtree = layoutSubtreeHorizontal(safeTree, startPersonId, collapsedSet);
  } else {
    rootSubtree = layoutSubtreeFlexible(safeTree, startPersonId, collapsedSet, mode);
  }

  // Flatten nodes
  const rawNodes: { id: string; x: number; y: number; width: number; height: number; isVertStack?: boolean }[] = [];
  function collectNodes(sub: SubtreeLayout) {
    // sub.x is center-relative in vertical mode
    const leftX = mode === 'horizontal' ? sub.x : sub.x - sub.width / 2;
    rawNodes.push({
      id: sub.id,
      x: leftX,
      y: sub.y,
      width: sub.width,
      height: sub.height,
      isVertStack: sub.isVerticallyStackedChildren,
    });
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
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }

  const PADDING = 24;
  const offsetX = -minX + PADDING;
  const offsetY = -minY + PADDING;

  const nodeMap = new Map<string, { x: number; y: number; width: number; height: number }>();
  const nodes: NodePosition[] = [];

  for (const n of rawNodes) {
    const person = safeTree.people[n.id];
    if (!person) continue;

    if (options?.excludePlaceholders && person.isPlaceholder) {
      continue;
    }

    const finalX = Math.round(n.x + offsetX);
    const finalY = Math.round(n.y + offsetY);
    nodeMap.set(n.id, { x: finalX, y: finalY, width: n.width, height: n.height });

    const isCollapsed = collapsedSet.has(n.id);
    const hasChildren = (person.childrenIds || []).length > 0;
    const totalDesc = countSubtreeDescendants(safeTree.people, n.id);

    nodes.push({
      id: n.id,
      x: finalX,
      y: finalY,
      width: n.width,
      height: n.height,
      isPlaceholder: !!person.isPlaceholder,
      name: person.name,
      generation: person.generation,
      hasChildren,
      isCollapsed,
      totalDescendants: totalDesc,
      parentId: person.parentId,
      childrenIds: person.childrenIds || [],
      branchDirection: person.branchDirection,
      isExtraNote: !!person.isExtraNote,
      extraNote: person.extraNote,
    });
  }

  // Generate orthogonal relationship lines
  const lines: TreeConnectionLine[] = [];

  for (const node of nodes) {
    const person = safeTree.people[node.id];
    if (!person || collapsedSet.has(node.id)) continue;

    const visibleChildren = (person.childrenIds || [])
      .map((cid) => ({ id: cid, pos: nodeMap.get(cid) }))
      .filter((c): c is { id: string; pos: { x: number; y: number; width: number; height: number } } => c.pos !== undefined);

    if (visibleChildren.length === 0) continue;

    const childrenDir = resolveChildrenDirection(person.branchDirection, mode);

    if (mode === 'horizontal') {
      // Horizontal mode
      const parentRightX = node.x + node.width;
      const parentRightY = node.y + node.height / 2;

      const firstChildX = visibleChildren[0].pos.x;
      const midX = Math.round((parentRightX + firstChildX) / 2);

      for (const child of visibleChildren) {
        const childLeftX = child.pos.x;
        const childLeftY = child.pos.y + child.pos.height / 2;
        const isDashed = Boolean(safeTree.people[child.id]?.isExtraNote);

        if (visibleChildren.length === 1 && Math.abs(parentRightY - childLeftY) <= 3) {
          // Direct straight horizontal line for aligned single child
          lines.push({
            id: `line_${node.id}_${child.id}`,
            fromId: node.id,
            toId: child.id,
            isDashed,
            points: [
              { x: parentRightX, y: parentRightY },
              { x: childLeftX, y: parentRightY },
            ],
          });
        } else if (Math.abs(parentRightY - childLeftY) <= 2) {
          // Direct straight line if vertically aligned
          lines.push({
            id: `line_${node.id}_${child.id}`,
            fromId: node.id,
            toId: child.id,
            isDashed,
            points: [
              { x: parentRightX, y: parentRightY },
              { x: childLeftX, y: childLeftY },
            ],
          });
        } else {
          lines.push({
            id: `line_${node.id}_${child.id}`,
            fromId: node.id,
            toId: child.id,
            isDashed,
            points: [
              { x: parentRightX, y: parentRightY },
              { x: midX, y: parentRightY },
              { x: midX, y: childLeftY },
              { x: childLeftX, y: childLeftY },
            ],
          });
        }
      }
    } else if (childrenDir === 'vertical') {
      // -----------------------------------------------------------
      // Direct Vertical column under this father:
      // - Direct 90° straight vertical line down to first son
      // - Clean, compact side rail for subsequent sons
      // -----------------------------------------------------------
      const parentBottomX = node.x + node.width / 2;
      const parentBottomY = node.y + node.height;
      const firstChild = visibleChildren[0];
      const firstChildTopX = firstChild.pos.x + firstChild.pos.width / 2;
      const firstChildTopY = firstChild.pos.y;
      const midY = Math.round((parentBottomY + firstChildTopY) / 2);
      const firstChildIsDashed = Boolean(safeTree.people[firstChild.id]?.isExtraNote);

      // Line to First Son: DIRECT 90-DEGREE STRAIGHT VERTICAL LINE!
      if (Math.abs(parentBottomX - firstChildTopX) <= 4) {
        // Pure 90° straight vertical line directly into first son top center!
        lines.push({
          id: `line_${node.id}_${firstChild.id}`,
          fromId: node.id,
          toId: firstChild.id,
          isDashed: firstChildIsDashed,
          points: [
            { x: parentBottomX, y: parentBottomY },
            { x: parentBottomX, y: firstChildTopY },
          ],
        });
      } else {
        // Clean centered 90° step if boxes differ slightly in width
        lines.push({
          id: `line_${node.id}_${firstChild.id}`,
          fromId: node.id,
          toId: firstChild.id,
          isDashed: firstChildIsDashed,
          points: [
            { x: parentBottomX, y: parentBottomY },
            { x: parentBottomX, y: midY },
            { x: firstChildTopX, y: midY },
            { x: firstChildTopX, y: firstChildTopY },
          ],
        });
      }

      // Subsequent sons: tidy, close side rail (not taking long detour!)
      if (visibleChildren.length > 1) {
        const minChildLeftX = Math.min(...visibleChildren.map((c) => c.pos.x));
        const sideRailX = minChildLeftX - 12;

        for (let i = 1; i < visibleChildren.length; i++) {
          const child = visibleChildren[i];
          const childMidY = child.pos.y + child.pos.height / 2;
          const childLeftX = child.pos.x;
          const isDashed = Boolean(safeTree.people[child.id]?.isExtraNote);

          lines.push({
            id: `line_${node.id}_${child.id}`,
            fromId: node.id,
            toId: child.id,
            isDashed,
            points: [
              { x: parentBottomX, y: midY },
              { x: sideRailX, y: midY },
              { x: sideRailX, y: childMidY },
              { x: childLeftX, y: childMidY },
            ],
          });
        }
      }
    } else if (childrenDir === 'rays') {
      // -----------------------------------------------------------
      // SUN RAYS / RIGHT-SIDE HORIZONTAL FAN
      // Connect from Father Right Edge into Sons Left Edge (upper, straight, below)
      // -----------------------------------------------------------
      const parentRightX = node.x + node.width;
      const parentRightY = node.y + node.height / 2;

      for (const child of visibleChildren) {
        const childLeftX = child.pos.x;
        const childLeftY = child.pos.y + child.pos.height / 2;
        const isDashed = Boolean(safeTree.people[child.id]?.isExtraNote);

        if (Math.abs(parentRightY - childLeftY) <= 4) {
          // Straight horizontal ray (➡)
          lines.push({
            id: `line_${node.id}_${child.id}`,
            fromId: node.id,
            toId: child.id,
            hasArrow: true,
            isDashed,
            points: [
              { x: parentRightX, y: parentRightY },
              { x: childLeftX, y: childLeftY },
            ],
          });
        } else {
          // Angled ray step (↗ Upper, ↘ Lower)
          const midX = Math.round(parentRightX + (childLeftX - parentRightX) * 0.45);
          lines.push({
            id: `line_${node.id}_${child.id}`,
            fromId: node.id,
            toId: child.id,
            hasArrow: true,
            isDashed,
            points: [
              { x: parentRightX, y: parentRightY },
              { x: midX, y: parentRightY },
              { x: midX, y: childLeftY },
              { x: childLeftX, y: childLeftY },
            ],
          });
        }
      }
    } else if (childrenDir === 'spine-right') {
      // -----------------------------------------------------------
      // RIGHT SPINE / COMB RIGHT (matches user sketch)
      // Vertical line drops from father, with horizontal arms to sons on right
      // -----------------------------------------------------------
      const trunkX = node.x + node.width / 2;
      const parentBottomY = node.y + node.height;

      for (const child of visibleChildren) {
        const childMidY = child.pos.y + child.pos.height / 2;
        const childLeftX = child.pos.x;
        const isDashed = Boolean(safeTree.people[child.id]?.isExtraNote);

        lines.push({
          id: `line_${node.id}_${child.id}`,
          fromId: node.id,
          toId: child.id,
          hasArrow: true,
          isDashed,
          points: [
            { x: trunkX, y: parentBottomY },
            { x: trunkX, y: childMidY },
            { x: childLeftX, y: childMidY },
          ],
        });
      }
    } else if (childrenDir === 'spine-left') {
      // -----------------------------------------------------------
      // LEFT SPINE / COMB LEFT
      // Vertical line drops from father, with horizontal arms to sons on left
      // -----------------------------------------------------------
      const trunkX = node.x + node.width / 2;
      const parentBottomY = node.y + node.height;

      for (const child of visibleChildren) {
        const childMidY = child.pos.y + child.pos.height / 2;
        const childRightX = child.pos.x + child.pos.width;
        const isDashed = Boolean(safeTree.people[child.id]?.isExtraNote);

        lines.push({
          id: `line_${node.id}_${child.id}`,
          fromId: node.id,
          toId: child.id,
          hasArrow: true,
          isDashed,
          points: [
            { x: trunkX, y: parentBottomY },
            { x: trunkX, y: childMidY },
            { x: childRightX, y: childMidY },
          ],
        });
      }
    } else if (childrenDir === 'alternating') {
      // -----------------------------------------------------------
      // ALTERNATING FISHBONE SPINE (Left & Right alternating arms)
      // -----------------------------------------------------------
      const trunkX = node.x + node.width / 2;
      const parentBottomY = node.y + node.height;

      for (const child of visibleChildren) {
        const childMidY = child.pos.y + child.pos.height / 2;
        const isRight = (child.pos.x + child.pos.width / 2) >= trunkX;
        const targetEntryX = isRight ? child.pos.x : (child.pos.x + child.pos.width);
        const isDashed = Boolean(safeTree.people[child.id]?.isExtraNote);

        lines.push({
          id: `line_${node.id}_${child.id}`,
          fromId: node.id,
          toId: child.id,
          hasArrow: true,
          isDashed,
          points: [
            { x: trunkX, y: parentBottomY },
            { x: trunkX, y: childMidY },
            { x: targetEntryX, y: childMidY },
          ],
        });
      }
    } else {
      // -----------------------------------------------------------
      // Horizontal side-by-side sibling bus-bar lines
      // -----------------------------------------------------------
      const parentBottomX = node.x + node.width / 2;
      const parentBottomY = node.y + node.height;

      const firstChildY = visibleChildren[0].pos.y;
      const midY = Math.round((parentBottomY + firstChildY) / 2);

      for (const child of visibleChildren) {
        const childTopX = child.pos.x + child.pos.width / 2;
        const childTopY = child.pos.y;
        const isDashed = Boolean(safeTree.people[child.id]?.isExtraNote);

        if (visibleChildren.length === 1 && Math.abs(parentBottomX - childTopX) <= 3) {
          // Single child aligned directly below father: direct 90° straight line
          lines.push({
            id: `line_${node.id}_${child.id}`,
            fromId: node.id,
            toId: child.id,
            isDashed,
            points: [
              { x: parentBottomX, y: parentBottomY },
              { x: parentBottomX, y: childTopY },
            ],
          });
        } else if (Math.abs(parentBottomX - childTopX) <= 2) {
          // Child directly underneath father: direct vertical drop
          lines.push({
            id: `line_${node.id}_${child.id}`,
            fromId: node.id,
            toId: child.id,
            isDashed,
            points: [
              { x: parentBottomX, y: parentBottomY },
              { x: childTopX, y: childTopY },
            ],
          });
        } else {
          lines.push({
            id: `line_${node.id}_${child.id}`,
            fromId: node.id,
            toId: child.id,
            isDashed,
            points: [
              { x: parentBottomX, y: parentBottomY },
              { x: parentBottomX, y: midY },
              { x: childTopX, y: midY },
              { x: childTopX, y: childTopY },
            ],
          });
        }
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
