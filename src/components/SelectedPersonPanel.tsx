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
            <span className="font-semibold text-slate-800">{person.childrenIds.length}</span>
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

        {/* Per-Father Branch Arrangement (Horizontal vs Vertical for sons) */}
        {person.childrenIds.length > 0 && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Sons Arrangement (മക്കളുടെ ക്രമീകരണം)
            </span>
            <p className="text-[11px] text-slate-500 leading-tight">
              Choose whether this father's sons arrange horizontally (side-by-side) or vertically (stacked in a column):
            </p>
            <div className="grid grid-cols-3 gap-1 pt-1">
              <button
                type="button"
                onClick={() => onChangeBranchDirection(personId, 'inherit')}
                className={`px-1.5 py-1.5 rounded-md text-[11px] font-medium border flex flex-col items-center justify-center transition-all ${
                  !person.branchDirection || person.branchDirection === 'inherit'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
                title="Follows tree default layout"
              >
                <Sparkles className="w-3.5 h-3.5 mb-0.5" />
                <span>Default</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeBranchDirection(personId, 'horizontal')}
                className={`px-1.5 py-1.5 rounded-md text-[11px] font-medium border flex flex-col items-center justify-center transition-all ${
                  person.branchDirection === 'horizontal'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
                title="Arrange sons horizontally (side-by-side)"
              >
                <Columns className="w-3.5 h-3.5 mb-0.5" />
                <span>Horizontal</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeBranchDirection(personId, 'vertical')}
                className={`px-1.5 py-1.5 rounded-md text-[11px] font-medium border flex flex-col items-center justify-center transition-all ${
                  person.branchDirection === 'vertical'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
                title="Stack sons vertically in a column"
              >
                <Rows className="w-3.5 h-3.5 mb-0.5 rotate-90" />
                <span>Vertical</span>
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
          {person.childrenIds.length > 1 && (
            <button
              onClick={() => onReorderChildren(personId)}
              className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-200 transition-all text-left shadow-sm"
            >
              <ArrowUpDown className="w-4 h-4 mr-2.5 text-slate-500 flex-shrink-0" />
              <span>Rearrange Sibling Order ({person.childrenIds.length})</span>
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
          {person.childrenIds.length > 0 && (
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
                <span>Delete {person.childrenIds.length > 0 ? 'Person / Branch' : 'Person'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
