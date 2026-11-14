export type LayoutMode = 'vertical' | 'horizontal' | 'hybrid';

export interface Person {
  id: string;
  name: string;
  parentId: string | null; // null for the first grandfather (root ancestor)
  childrenIds: string[]; // Ordered IDs of sons/children
  generation: number; // 1 for first grandfather, 2 for sons, 3 for grandsons, etc.
  isPlaceholder?: boolean; // True if it's an empty placeholder box
}

export interface FamilyTreeData {
  id: string;
  title: string;
  rootPersonId: string;
  people: Record<string, Person>;
  layoutMode: LayoutMode;
  fontFamily?: string; // Malayalam font: 'Noto Sans Malayalam' | 'Manjari' | 'Gayathri' | 'Anek Malayalam'
  collapsedBranchIds?: string[]; // IDs of people whose descendant subtrees are collapsed
  createdAt: number;
  updatedAt: number;
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isPlaceholder: boolean;
  name: string;
  generation: number;
  hasChildren: boolean;
  isCollapsed: boolean;
  totalDescendants: number;
  parentId: string | null;
  childrenIds: string[];
}

export interface TreeConnectionLine {
  id: string;
  fromId: string;
  toId: string;
  points: { x: number; y: number }[]; // Orthogonal path points
}

export interface TreeLayoutResult {
  nodes: NodePosition[];
  lines: TreeConnectionLine[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

export interface TreeMeta {
  id: string;
  title: string;
  rootName: string;
  personCount: number;
  updatedAt: number;
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

