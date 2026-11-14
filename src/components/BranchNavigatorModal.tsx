import React, { useState, useMemo } from 'react';
import { X, Search, ChevronRight } from 'lucide-react';
import { FamilyTreeData } from '../types';
import { countSubtreeDescendants } from '../utils/treeOperations';

interface BranchNavigatorModalProps {
  tree: FamilyTreeData;
  isOpen: boolean;
  onClose: () => void;
  onSelectPerson: (id: string) => void;
}

export const BranchNavigatorModal: React.FC<BranchNavigatorModalProps> = ({
  tree,
  isOpen,
  onClose,
  onSelectPerson,
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedGen, setSelectedGen] = useState<number | null>(null);

  const peopleList = useMemo(() => {
    return Object.values(tree.people)
      .filter((p) => {
        const matchesName = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesGen = selectedGen === null || p.generation === selectedGen;
        return matchesName && matchesGen;
      })
      .sort((a, b) => a.generation - b.generation || a.name.localeCompare(b.name));
  }, [tree.people, search, selectedGen]);

  // Max generation in tree
  const maxGen = useMemo(() => {
    let max = 1;
    for (const p of Object.values(tree.people)) {
      if (p.generation > max) max = p.generation;
    }
    return max;
  }, [tree.people]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Family Branch Navigator</h3>
            <p className="text-xs text-slate-500 mt-0.5">Quickly find and jump to any member or branch</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Generation Filters */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search family member by name..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          {/* Generation chips */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedGen(null)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                selectedGen === null
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Generations
            </button>
            {Array.from({ length: maxGen }, (_, i) => i + 1).map((gen) => (
              <button
                key={gen}
                onClick={() => setSelectedGen(gen)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                  selectedGen === gen
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Gen {gen} {gen === 1 ? '(Root)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-1">
          {peopleList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No family members match your search criteria.
            </div>
          ) : (
            peopleList.map((person) => {
              const isRoot = person.id === tree.rootPersonId;
              const totalDesc = countSubtreeDescendants(tree.people, person.id);
              const father = person.parentId ? tree.people[person.parentId] : null;

              return (
                <div
                  key={person.id}
                  onClick={() => {
                    onSelectPerson(person.id);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-sky-200 hover:bg-sky-50/50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-7 h-7 rounded bg-slate-100 group-hover:bg-sky-100 text-slate-500 group-hover:text-sky-600 flex items-center justify-center text-xs font-bold">
                      G{person.generation}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-800 truncate" title={person.name}>
                          {person.name || (person.isPlaceholder ? 'Empty Box' : 'Unnamed')}
                        </span>
                        {isRoot && (
                          <span className="text-[10px] bg-sky-100 text-sky-700 font-bold px-1.5 py-0.2 rounded">
                            Grandfather
                          </span>
                        )}
                        {person.isPlaceholder && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded italic">
                            Placeholder
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {father ? `Son of ${father.name}` : 'First Grandfather'} • {(person.childrenIds || []).length} sons • {totalDesc} descendants
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 transition-colors" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
