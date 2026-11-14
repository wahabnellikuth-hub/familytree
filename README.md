# Paternal Family Tree Builder

A complete, modern, responsive web application for constructing, organizing, editing, saving, and exporting comprehensive paternal family lineage charts.

## Key Features

1. **Strict Paternal Lineage**
   - Focuses exclusively on paternal bloodline relationships (starting grandfather, sons, grandsons, great-grandsons, and subsequent generations).
   - Clean, professional rectangular boxes containing **only the person's name** (no emojis, profile photos, or decorative symbols).

2. **Intelligent Recursive Tree Layout Engine**
   - **Descendant-Based Space Allocation**: Analyzes the total descendant subtrees at all levels, giving larger branches proportionally more horizontal and vertical breathing room while preventing overlaps.
   - **Three Layout Modes**:
     - **Vertical Layout**: Grandfather at top, generations expanding downwards.
     - **Horizontal Layout**: Grandfather on left, generations expanding towards the right.
     - **Automatic Hybrid Layout**: Analyzes structure to balance width/height aspect ratios for dense families.
   - Clean, orthogonal relationship bus-bars and connector lines.

3. **Optional Reserved Placeholder Boxes**
   - Support for empty placeholder boxes to reserve space for future children.
   - Easily convert placeholder boxes into named family members once details are available.

4. **Complete Editing & Branch Management**
   - Add single or multiple children in one step with dynamic name list inputs.
   - Edit person names or convert placeholders anytime.
   - Sibling reordering (adjust birth/display order from eldest to youngest).
   - Reparenting: Move a person and their entire branch under another father with cycle prevention.
   - Safe branch and individual deletion with descendant warnings.
   - Full **Undo (Ctrl+Z) and Redo (Ctrl+Y)** history stack.

5. **Branch Exploration & Navigation**
   - **Branch Expand/Collapse**: Collapse dense subtrees to keep large trees manageable with visible descendant count badges.
   - **Focus Mode (View Selected Branch)**: Isolate and display only a specific person's descendants with a single click.
   - **Branch Highlighting**: Selecting any person visually highlights their lineage from root to all descendants.
   - **Branch Navigator**: Fast search dialog across all family members with generation filtering and smooth jump-to-node animation.

6. **Persistence & Autosave**
   - Local browser storage using **IndexedDB**.
   - Multiple family trees management: Create, open, rename, duplicate, and delete saved trees.
   - Real-time autosave with status indicator (*Saving...*, *Saved*, *Unsaved Changes*).
   - JSON Backup & Restore for import/export across devices.

7. **High-Resolution Export**
   - Export full trees or selected branches as **PNG** and **JPG/JPEG**.
   - Custom scale (1x, 2x for print-ready high-DPI, 3x for ultra-sharp posters).
   - Exports the entire chart bounding box (not just the visible viewport).
   - Omits editing controls and UI buttons from exported images.

8. **Section 15 Sample 5-Generation Test Family**
   - One-click loader built right into the welcome dashboard to test Grandfather A, 3 sons (A1, A2, A3), unequal branch sizes, and 5 generations.

---

## Getting Started

### Development
```bash
npm install
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### Production Build
```bash
npm run build
npm run preview
```

