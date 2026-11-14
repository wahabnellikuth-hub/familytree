import React, { useState, useEffect } from 'react';
import { X, Check, ArrowUp, ArrowDown } from 'lucide-react';
import { Person } from '../types';

interface ReorderSiblingsModalProps {
  isOpen: boolean;
  fatherName: string;
  children: Person[];
  onClose: () => void;
  onConfirm: (newOrderIds: string[]) => void;
}

export const ReorderSiblingsModal: React.FC<ReorderSiblingsModalProps> = ({
  isOpen,
  fatherName,
  children,
  onClose,
  onConfirm,
}) => {
  const [orderedChildren, setOrderedChildren] = useState<Person[]>([]);

  useEffect(() => {
    setOrderedChildren([...children]);
  }, [children, isOpen]);

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...orderedChildren];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setOrderedChildren(next);
  };

  const moveDown = (index: number) => {
    if (index === orderedChildren.length - 1) return;
    const next = [...orderedChildren];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setOrderedChildren(next);
  };

  const handleSave = () => {
    onConfirm(orderedChildren.map((c) => c.id));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Rearrange Sibling Order</h3>
            <p className="text-xs text-slate-500 mt-0.5">Sons of: {fatherName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-500">
            Use the arrow buttons to position siblings from eldest to youngest (left-to-right / top-to-bottom in chart).
          </p>

          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
            {orderedChildren.map((child, index) => (
              <div
                key={child.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 shadow-sm transition-all"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="text-xs font-bold text-slate-400 w-4 text-center">
                    {index + 1}
                  </span>
                  <span className="text-xs font-medium text-slate-800 truncate" title={child.name}>
                    {child.name || 'Unnamed'}
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveUp(index)}
                    className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move earlier in sibling order"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === orderedChildren.length - 1}
                    onClick={() => moveDown(index)}
                    className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move later in sibling order"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-sm transition-colors flex items-center"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Apply Order</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

