import React, { useState, useMemo } from 'react';
import { X, Check, Search, AlertCircle } from 'lucide-react';
import { FamilyTreeData } from '../types';
import { getDescendantIds } from '../utils/treeOperations';

interface MovePersonModalProps {
  tree: FamilyTreeData;
  personId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newFatherId: string) => void;
}

export const MovePersonModal: React.FC<MovePersonModalProps> = ({
  tree,
  personId,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFatherId, setSelectedFatherId] = useState<string>('');

  const person = tree.people[personId];

  // Compute invalid fathers (cannot be person itself or any of its descendants!)
  const invalidFatherIds = useMemo(() => {
    if (!personId) return new Set<string>();
    const descendants = getDescendantIds(tree.people, personId);
    descendants.add(personId);
    if (person?.parentId) {
      descendants.add(person.parentId); // Already their father
    }
    return descendants;
  }, [tree.people, personId, person?.parentId]);

  // Candidates list
  const validCandidates = useMemo(() => {
    return Object.values(tree.people)
      .filter((p) => !invalidFatherIds.has(p.id) && !p.isPlaceholder)
      .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.generation - b.generation || a.name.localeCompare(b.name));
  }, [tree.people, invalidFatherIds, searchTerm]);

  if (!isOpen || !person) return null;

  const handleConfirm = () => {
    if (!selectedFatherId) return;
    onConfirm(selectedFatherId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Move to Another Father</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Moving: <span className="font-medium text-slate-700">{person.name}</span> and his branch
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200/80">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 text-amber-600" />
            <span>
              Moving this person will transfer their entire descendant branch under the new father and recalculate generational levels. Circular connections are prohibited.
            </span>
          </div>

          {/* Search filter */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search father by name..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Candidates list */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-md p-1.5">
            {validCandidates.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No eligible fathers found.
              </div>
            ) : (
              validCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  onClick={() => setSelectedFatherId(candidate.id)}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-xs transition-colors ${
                    selectedFatherId === candidate.id
                      ? 'bg-sky-50 border border-sky-300 text-sky-900 font-medium'
                      : 'hover:bg-slate-50 border border-transparent text-slate-700'
                  }`}
                >
                  <div className="truncate">
                    <span className="font-medium">{candidate.name}</span>
                    <span className="text-[11px] text-slate-400 ml-2">Gen {candidate.generation}</span>
                  </div>
                  {candidate.id === tree.rootPersonId && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                      Root Grandfather
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedFatherId}
              onClick={handleConfirm}
              className="px-4 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-md shadow-sm transition-colors flex items-center"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Confirm Move</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

