import React from 'react';
import { FamilyTreeData, BranchDirection } from '../types';
import { countSubtreeDescendants } from '../utils/treeOperations';
import {
  UserPlus,
  Edit2,
  BoxSelect,
  Trash2,
  Eye,
  GitBranch,
  ArrowUpDown,
  Move,
  X,
  Columns,
  Rows,
  Sparkles,
  Sun,
} from 'lucide-react';

interface SelectedPersonPanelProps {
  tree: FamilyTreeData;
  personId: string;
  isFocusedBranch: boolean;
  onClose: () => void;
  onAddChildren: (id: string) => void;
  onAddEmptyBox: (id: string) => void;
  onEditName: (id: string) => void;
  onToggleFocusBranch: (id: string) => void;
  onReorderChildren: (id: string) => void;
  onMovePerson: (id: string) => void;
  onDeletePerson: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onChangeBranchDirection: (id: string, dir: BranchDirection) => void;
}

export const SelectedPersonPanel: React.FC<SelectedPersonPanelProps> = ({
  tree,
  personId,
  isFocusedBranch,
  onClose,
  onAddChildren,
  onAddEmptyBox,
  onEditName,
  onToggleFocusBranch,
  onReorderChildren,
  onMovePerson,
  onDeletePerson,
  onToggleCollapse,
  onChangeBranchDirection,
}) => {
  const person = tree.people[personId];
  if (!person) return null;

  const isRoot = personId === tree.rootPersonId;
  const isPlaceholder = person.isPlaceholder;
  const father = person.parentId ? tree.people[person.parentId] : null;
  const totalDescendants = countSubtreeDescendants(tree.people, personId);
  const isCollapsed = (tree.collapsedBranchIds || []).includes(personId);
  const childrenList = person.childrenIds || [];

  // Generation label
  const getGenerationLabel = (gen: number) => {
    if (gen === 1) return 'Generation 1 (Starting Grandfather)';
    if (gen === 2) return 'Generation 2 (Son)';
    if (gen === 3) return 'Generation 3 (Grandson)';
    if (gen === 4) return 'Generation 4 (Great-Grandson)';
    return `Generation ${gen} Descendant`;
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-80 max-w-[85vw] bg-white border-l border-slate-200 shadow-xl flex flex-col h-full z-40 transition-all duration-200 select-none"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {isRoot ? 'Starting Ancestor' : isPlaceholder ? 'Reserved Placeholder' : 'Family Member'}
          </span>
          <h2 className="text-base font-semibold text-slate-900 truncate max-w-[200px]" title={person.name}>
            {person.name || (isPlaceholder ? 'Empty Box' : 'Unnamed')}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Details list */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Generation</span>
            <span className="font-semibold text-slate-800">{getGenerationLabel(person.generation)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Father</span>
            <span className="font-semibold text-slate-800 truncate max-w-[150px]">
              {father ? father.name : isRoot ? 'None (Root Ancestor)' : 'Unknown'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Immediate Sons</span>
            <span className="font-semibold text-slate-800">{childrenList.length}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Total Descendants</span>
            <span className="font-semibold text-slate-800">{totalDescendants}</span>
          </div>

          {isPlaceholder && (
            <div className="mt-2 pt-2 border-t border-slate-200 text-amber-700 text-[11px]">
              ⚠️ This is an empty placeholder box. Convert it to a named family member when the name becomes available.
            </div>
          )}
        </div>

        {/* Per-Father Branch Arrangement Options */}
        {childrenList.length > 0 && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2.5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                Sons Arrangement (മക്കളുടെ ക്രമീകരണം)
              </span>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                Choose how this father's sons are arranged in the lineage:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              {/* Option 1: Default */}
              <button
                type="button"
                onClick={() => onChangeBranchDirection(personId, 'inherit')}
                className={`px-2 py-2 rounded-lg text-[11px] font-medium border flex items-center space-x-2 transition-all ${
                  !person.branchDirection || person.branchDirection === 'inherit'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
                title="Follows tree default layout"
              >
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <div className="text-left leading-tight">
                  <div className="font-semibold">Default</div>
                  <div className="text-[9.5px] opacity-80">Tree balance</div>
                </div>
              </button>

              {/* Option 2: Horizontal Row */}
              <button
                type="button"
                onClick={() => onChangeBranchDirection(personId, 'horizontal')}
                className={`px-2 py-2 rounded-lg text-[11px] font-medium border flex items-center space-x-2 transition-all ${
                  person.branchDirection === 'horizontal'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
                title="Arrange sons side-by-side in a horizontal row"
              >
                <Columns className="w-4 h-4 flex-shrink-0" />
                <div className="text-left leading-tight">
                  <div className="font-semibold">Horizontal (↔)</div>
                  <div className="text-[9.5px] opacity-80">Side-by-side row</div>
                </div>
              </button>

              {/* Option 3: Direct Vertical (90° Straight to First Son) */}
              <button
                type="button"
                onClick={() => onChangeBranchDirection(personId, 'vertical')}
                className={`px-2 py-2 rounded-lg text-[11px] font-medium border flex items-center space-x-2 transition-all ${
                  person.branchDirection === 'vertical'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
                title="Direct 90° straight vertical line down to first son, stacked in a column"
              >
                <Rows className="w-4 h-4 rotate-90 flex-shrink-0" />
                <div className="text-left leading-tight">
                  <div className="font-semibold">Vertical (↕)</div>
                  <div className="text-[9.5px] opacity-80">90° Direct Column</div>
                </div>
              </button>

              {/* Option 4: Sun Rays (Right-Side Fan: Upper, Straight, Below) */}
              <button
                type="button"
                onClick={() => onChangeBranchDirection(personId, 'rays')}
                className={`px-2 py-2 rounded-lg text-[11px] font-medium border flex items-center space-x-2 transition-all ${
                  person.branchDirection === 'rays'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
                title="Arranges sons to the right side of father's box as rays of sun (upper, straight, below) - ideal between trees"
              >
                <Sun className="w-4 h-4 flex-shrink-0 text-amber-500" />
                <div className="text-left leading-tight">
                  <div className="font-semibold">Sun Rays (☀️)</div>
                  <div className="text-[9.5px] opacity-80">Right-side fan</div>
                </div>
              </button>

              {/* Option 5: Single Line Staggered (25%, 50%, 75%, 100%) */}
              <button
                type="button"
                onClick={() => onChangeBranchDirection(personId, 'staggered')}
                className={`col-span-2 px-2.5 py-2 rounded-lg text-[11px] font-medium border flex items-center space-x-2.5 transition-all ${
                  person.branchDirection === 'staggered'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
                title="Drops a single line down with sons branching off at 25%, 50%, 75%, 100% heights"
              >
                <GitBranch className="w-4 h-4 flex-shrink-0 rotate-180" />
                <div className="text-left leading-tight flex-1">
                  <div className="font-semibold flex items-center justify-between">
                    <span>Single Line Staggered (⑂)</span>
                    <span className="text-[10px] font-normal opacity-90 bg-slate-200/60 px-1 rounded">25% • 50% • 75% • 100%</span>
                  </div>
                  <div className="text-[9.5px] opacity-80">Single line down with proportional branch arms</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
            Actions
          </span>

          {/* Add Children */}
          <button
            onClick={() => onAddChildren(personId)}
            className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-sky-50 hover:text-sky-700 rounded-md border border-slate-200 hover:border-sky-300 transition-all text-left shadow-sm"
          >
            <UserPlus className="w-4 h-4 mr-2.5 text-sky-600 flex-shrink-0" />
            <span>Add Children</span>
          </button>

          {/* Add Empty Child Box */}
          <button
            onClick={() => onAddEmptyBox(personId)}
            className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-200 transition-all text-left shadow-sm"
          >
            <BoxSelect className="w-4 h-4 mr-2.5 text-slate-500 flex-shrink-0" />
            <span>Add Empty Child Box (Reserved)</span>
          </button>

          {/* Edit Name / Convert Placeholder */}
          <button
            onClick={() => onEditName(personId)}
            className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-200 transition-all text-left shadow-sm"
          >
            <Edit2 className="w-4 h-4 mr-2.5 text-slate-600 flex-shrink-0" />
            <span>{isPlaceholder ? 'Convert Placeholder to Name' : 'Edit Name'}</span>
          </button>

          {/* View Descendants Branch separately (Focus) */}
          <button
            onClick={() => onToggleFocusBranch(personId)}
            className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-md border transition-all text-left shadow-sm ${
              isFocusedBranch
                ? 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700'
                : 'text-slate-700 bg-white hover:bg-sky-50 hover:text-sky-700 border-slate-200'
            }`}
          >
            <Eye className="w-4 h-4 mr-2.5 flex-shrink-0" />
            <span>{isFocusedBranch ? 'Exit Branch View (Show All)' : 'View Descendant Branch Only'}</span>
          </button>

          {/* Sibling Order */}
          {childrenList.length > 1 && (
            <button
              onClick={() => onReorderChildren(personId)}
              className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-200 transition-all text-left shadow-sm"
            >
              <ArrowUpDown className="w-4 h-4 mr-2.5 text-slate-500 flex-shrink-0" />
              <span>Rearrange Sibling Order ({childrenList.length})</span>
            </button>
          )}

          {/* Move to another father (reparent) */}
          {!isRoot && (
            <button
              onClick={() => onMovePerson(personId)}
              className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-200 transition-all text-left shadow-sm"
            >
              <Move className="w-4 h-4 mr-2.5 text-slate-500 flex-shrink-0" />
              <span>Move to Another Father</span>
            </button>
          )}

          {/* Collapse / Expand Branch */}
          {childrenList.length > 0 && (
            <button
              onClick={() => onToggleCollapse(personId)}
              className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-200 transition-all text-left shadow-sm"
            >
              <GitBranch className="w-4 h-4 mr-2.5 text-slate-500 flex-shrink-0" />
              <span>{isCollapsed ? `Expand Branch (+${totalDescendants})` : 'Collapse Descendant Branch'}</span>
            </button>
          )}

          {/* Delete Person / Branch */}
          {!isRoot && (
            <div className="pt-2">
              <button
                onClick={() => onDeletePerson(personId)}
                className="w-full flex items-center px-3 py-2 text-xs font-medium text-red-600 bg-white hover:bg-red-50 rounded-md border border-red-200 hover:border-red-300 transition-all text-left shadow-sm"
              >
                <Trash2 className="w-4 h-4 mr-2.5 text-red-500 flex-shrink-0" />
                <span>Delete {childrenList.length > 0 ? 'Person / Branch' : 'Person'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
