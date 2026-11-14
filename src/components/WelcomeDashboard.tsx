import React, { useState, useEffect } from 'react';
import { TreeMeta, FamilyTreeData } from '../types';
import { getAllTrees, deleteTree, duplicateTree, parseAndValidateTreeJSON } from '../utils/db';
import {
  FolderOpen,
  PlusCircle,
  FileCode,
  Trash2,
  Copy,
  Clock,
  Users,
  ChevronRight,
  GitFork,
  Upload,
  Sparkles,
  AlertCircle,
  Cloud,
} from 'lucide-react';

interface WelcomeDashboardProps {
  onOpenTree: (id: string) => void;
  onCreateTree: (title: string, grandfatherName: string) => void;
  onLoadSampleTree: () => void;
  onImportTree: (tree: FamilyTreeData) => void;
}

export const WelcomeDashboard: React.FC<WelcomeDashboardProps> = ({
  onOpenTree,
  onCreateTree,
  onLoadSampleTree,
  onImportTree,
}) => {
  const [trees, setTrees] = useState<TreeMeta[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newGrandfather, setNewGrandfather] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);

  const loadTreesList = async () => {
    const list = await getAllTrees();
    setTrees(list);
  };

  useEffect(() => {
    loadTreesList();
  }, []);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newGrandfather.trim()) return;
    onCreateTree(newTitle.trim(), newGrandfather.trim());
  };

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to permanently delete "${title}"?`)) {
      await deleteTree(id);
      await loadTreesList();
    }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy = await duplicateTree(id);
    if (copy) {
      await loadTreesList();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseAndValidateTreeJSON(content);
      if (res.valid && res.tree) {
        setImportError(null);
        onImportTree(res.tree);
      } else {
        setImportError(res.error || 'Failed to import JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between overflow-y-auto select-none">
      {/* Top Navbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm">
              <GitFork className="w-5 h-5 rotate-180" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Paternal Family Tree Builder
              </h1>
              <p className="text-xs text-slate-500">
                Lineage management, intelligent hierarchical layout & high-res export
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span>Firebase Connected</span>
            </div>

            <button
              onClick={onLoadSampleTree}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors shadow-sm"
              title="Load the 5-Generation Test Family from Section 15"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Load 5-Gen Test Family</span>
            </button>

            <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shadow-sm">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {importError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{importError}</span>
          </div>
        )}

        {/* Quick Actions Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Action 1: Create New Tree */}
          <div
            onClick={() => setIsCreating(true)}
            className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-sky-400 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-800 group-hover:text-sky-700 transition-colors">
                Create New Family Tree
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Start a fresh paternal lineage from the first grandfather and expand through sons and subsequent generations.
              </p>
            </div>
            <div className="mt-5 flex items-center text-xs font-semibold text-sky-600 group-hover:translate-x-1 transition-transform">
              <span>Start building</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* Action 2: Load Sample Test Family */}
          <div
            onClick={onLoadSampleTree}
            className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-800 group-hover:text-amber-700 transition-colors">
                Load 5-Gen Test Family
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Test Section 15 specifications with Grandfather A, 3 sons, unequal descendant branches, placeholders, and 5 generations.
              </p>
            </div>
            <div className="mt-5 flex items-center text-xs font-semibold text-amber-700 group-hover:translate-x-1 transition-transform">
              <span>Explore sample tree</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* Action 3: Import JSON Tree */}
          <label className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileCode className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                Restore from JSON Backup
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Upload a previously saved .json backup file to continue editing or view your family lineage chart.
              </p>
            </div>
            <div className="mt-5 flex items-center text-xs font-semibold text-emerald-700 group-hover:translate-x-1 transition-transform">
              <span>Choose JSON file</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Saved Family Trees List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Your Saved Family Trees</h3>
              <p className="text-xs text-slate-500">Stored safely in local browser storage (IndexedDB)</p>
            </div>
            <span className="text-xs font-medium text-slate-400">
              {trees.length} {trees.length === 1 ? 'tree' : 'trees'} found
            </span>
          </div>

          {trees.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-700">No saved family trees yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create a new tree from scratch or load the 5-generation sample tree to test all features.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors"
                >
                  Create Your First Tree
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trees.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onOpenTree(t.id)}
                  className="group bg-white rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-md p-4 transition-all duration-150 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-sky-700 transition-colors truncate max-w-[200px]" title={t.title}>
                        {t.title}
                      </h4>
                      <div className="flex items-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDuplicate(t.id, e)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                          title="Duplicate tree"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(t.id, t.title, e)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete tree"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-400">Grandfather:</span>
                        <span className="font-medium text-slate-800 truncate">{t.rootName}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.personCount} family members</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(t.updatedAt)}
                    </span>
                    <span className="text-sky-600 font-semibold flex items-center group-hover:translate-x-0.5 transition-transform">
                      Open <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 px-6 bg-white text-center text-xs text-slate-500">
        Paternal Family Tree Builder • Paternal Lineage Only • Unlimited Generations • High-Resolution Export
      </footer>

      {/* Create New Tree Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
              <h3 className="font-semibold text-slate-800 text-sm">Create New Family Tree</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Establish the starting ancestor of the paternal lineage
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Family Tree Title
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. നെല്ലിക്കുത്ത് തറവാട് / Al-Mansoor Lineage"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Name of First Grandfather (Starting Ancestor) / ആദ്യ മുത്തശ്ശന്റെ പേര്
                </label>
                <input
                  type="text"
                  required
                  value={newGrandfather}
                  onChange={(e) => setNewGrandfather(e.target.value)}
                  placeholder="e.g. അബ്ദുല്ല / Grandfather Abdullah"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 font-sans"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  The starting ancestor will be positioned at the root of the family tree.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || !newGrandfather.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-md shadow-sm transition-colors"
                >
                  Create Family Tree
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
