import React from 'react';
import { NodePosition } from '../types';
import { Plus, ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PersonBoxProps {
  node: NodePosition;
  isSelected: boolean;
  isHighlighted: boolean;
  isRoot: boolean;
  fontFamily?: string;
  onSelect: (id: string) => void;
  onAddChildren: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onOpenActions: (id: string) => void;
}

export const PersonBox: React.FC<PersonBoxProps> = ({
  node,
  isSelected,
  isHighlighted,
  isRoot,
  fontFamily,
  onSelect,
  onAddChildren,
  onToggleCollapse,
  onOpenActions,
}) => {
  const isPlaceholder = node.isPlaceholder;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      className={`group absolute select-none rounded-[5px] transition-all duration-150 cursor-pointer flex flex-col justify-center items-center px-2 py-1 ${
        isPlaceholder
          ? 'bg-slate-50/90 border-2 border-dashed border-slate-300 hover:border-slate-400 text-slate-500'
          : isRoot
          ? 'bg-white border-2 border-sky-600 shadow-sm text-slate-900 font-semibold'
          : 'bg-white border border-slate-300 hover:border-slate-400 shadow-sm text-slate-800'
      } ${
        isSelected
          ? 'ring-2 ring-sky-500 ring-offset-2 border-sky-600 shadow-md'
          : isHighlighted
          ? 'ring-2 ring-amber-400 border-amber-500 bg-amber-50/40'
          : ''
      }`}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
        height: `${node.height}px`,
        fontFamily: fontFamily || '"Noto Sans Malayalam", "Manjari", "Gayathri", "Kartika", "Rachana", "AnjaliOldLipi", system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Branch custom orientation pill if set */}
      {node.hasChildren && node.branchDirection && node.branchDirection !== 'inherit' && (
        <span
          className={`absolute -top-2 left-1.5 px-1 py-0.2 rounded text-[9px] font-semibold border shadow-xs ${
            node.branchDirection === 'rays'
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : node.branchDirection === 'staggered'
              ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
              : 'bg-sky-100 text-sky-800 border-sky-300'
          }`}
          title={`Branch arrangement: ${node.branchDirection}`}
        >
          {node.branchDirection === 'vertical'
            ? '↕ Col'
            : node.branchDirection === 'rays'
            ? '☀️ Rays'
            : node.branchDirection === 'staggered'
            ? '⑂ Line'
            : '↔ Row'}
        </span>
      )}

      {/* Box Name: Strictly person's name only (no emojis, human icons, or profile pictures) */}
      <div
        className={`w-full text-center break-words px-1.5 text-[12.5px] leading-snug tracking-normal ${
          isPlaceholder ? 'italic text-slate-400 text-[11.5px]' : isRoot ? 'font-semibold text-sky-950' : 'font-medium'
        }`}
        title={node.name}
      >
        {node.name || (isPlaceholder ? 'Empty Box' : 'Unnamed')}
      </div>

      {/* Collapse / Expand toggle indicator if node has children */}
      {node.hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(node.id);
          }}
          className={`absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center h-5 px-1.5 rounded-full text-[10px] font-bold shadow border transition-all z-10 ${
            node.isCollapsed
              ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
          title={node.isCollapsed ? `Expand branch (${node.totalDescendants} descendants)` : 'Collapse branch'}
        >
          {node.isCollapsed ? (
            <>
              <ChevronRight className="w-3 h-3 mr-0.5" />
              <span>+{node.totalDescendants}</span>
            </>
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      )}

      {/* Quick action buttons (Visible on hover and when selected on touch/mobile) */}
      <div
        className={`absolute -top-3 right-0 transition-opacity flex items-center space-x-1 z-20 ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddChildren(node.id);
          }}
          className="p-1 rounded bg-sky-600 text-white hover:bg-sky-700 shadow text-[10px] flex items-center"
          title="Add Children"
        >
          <Plus className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenActions(node.id);
          }}
          className="p-1 rounded bg-slate-700 text-white hover:bg-slate-800 shadow text-[10px] flex items-center"
          title="Actions Menu"
        >
          <MoreHorizontal className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

