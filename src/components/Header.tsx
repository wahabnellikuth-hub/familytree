import React, { useState } from 'react';
import {
  Save,
  Undo2,
  Redo2,
  UserPlus,
  Columns,
  Rows,
  Sparkles,
  RefreshCw,
  Download,
  Search,
  ArrowLeft,
  Check,
  AlertCircle,
  Edit3,
} from 'lucide-react';
import { LayoutMode, SaveStatus } from '../types';

interface HeaderProps {
  treeTitle: string;
  onUpdateTreeTitle: (newTitle: string) => void;
  layoutMode: LayoutMode;
  onChangeLayoutMode: (mode: LayoutMode) => void;
  onReorganise: () => void;
  saveStatus: SaveStatus;
  onManualSave: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenAddChildRoot: () => void;
  onOpenExport: () => void;
  onOpenNavigator: () => void;
  onReturnToDashboard: () => void;
  focusedBranchName: string | null;
  onExitBranchFocus: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  treeTitle,
  onUpdateTreeTitle,
  layoutMode,
  onChangeLayoutMode,
  onReorganise,
  saveStatus,
  onManualSave,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenAddChildRoot,
  onOpenExport,
  onOpenNavigator,
  onReturnToDashboard,
  focusedBranchName,
  onExitBranchFocus,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(treeTitle);

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempTitle.trim()) {
      onUpdateTreeTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between select-none z-30 shadow-sm">
      {/* Left: Back to Dashboard & Tree Title */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onReturnToDashboard}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* Tree Title with Quick Edit */}
        {isEditingTitle ? (
          <form onSubmit={handleTitleSubmit} className="flex items-center space-x-1">
            <input
              type="text"
              autoFocus
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              className="text-sm font-bold text-slate-800 border border-sky-400 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </form>
        ) : (
          <div
            onClick={() => {
              setTempTitle(treeTitle);
              setIsEditingTitle(true);
            }}
            className="flex items-center space-x-1.5 cursor-pointer group py-1 px-1.5 rounded hover:bg-slate-50 transition-colors"
            title="Click to rename tree"
          >
            <h1 className="text-sm font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {treeTitle}
            </h1>
            <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-sky-600 transition-colors" />
          </div>
        )}

        {/* Autosave status indicator */}
        <div className="hidden lg:flex items-center space-x-1 text-[11px] font-medium text-slate-400 pl-1">
          {saveStatus === 'saved' && (
            <span className="flex items-center text-emerald-600">
              <Check className="w-3 h-3 mr-0.5" /> Saved
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="flex items-center text-sky-600 animate-pulse">
              <RefreshCw className="w-3 h-3 mr-0.5 animate-spin" /> Saving...
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="flex items-center text-amber-600">
              ● Unsaved changes
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center text-red-600">
              <AlertCircle className="w-3 h-3 mr-0.5" /> Save failed
            </span>
          )}
        </div>
      </div>

      {/* Center: Branch Focus Banner if active */}
      {focusedBranchName && (
        <div className="hidden md:flex items-center space-x-2 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full text-xs text-sky-800 animate-in fade-in">
          <span>Viewing Branch: <strong>{focusedBranchName}</strong></span>
          <button
            onClick={onExitBranchFocus}
            className="font-semibold text-sky-700 hover:text-sky-900 underline text-[11px] ml-1"
          >
            Return to Main Tree
          </button>
        </div>
      )}

      {/* Right: Workspace Toolbar Actions */}
      <div className="flex items-center space-x-1 sm:space-x-1.5">
        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-200 my-auto" />

        {/* Layout Modes Segmented Control */}
        <div className="bg-slate-100 p-0.5 rounded-lg flex items-center space-x-0.5">
          <button
            onClick={() => onChangeLayoutMode('vertical')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 transition-all ${
              layoutMode === 'vertical'
                ? 'bg-white text-sky-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Vertical Layout (Top-to-Bottom)"
          >
            <Rows className="w-3.5 h-3.5 rotate-90" />
            <span className="hidden xl:inline">Vertical</span>
          </button>

          <button
            onClick={() => onChangeLayoutMode('horizontal')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 transition-all ${
              layoutMode === 'horizontal'
                ? 'bg-white text-sky-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Horizontal Layout (Left-to-Right)"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Horizontal</span>
          </button>

          <button
            onClick={() => onChangeLayoutMode('hybrid')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 transition-all ${
              layoutMode === 'hybrid'
                ? 'bg-white text-sky-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Automatic Hybrid Layout"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Hybrid</span>
          </button>
        </div>

        {/* Reorganise Tree */}
        <button
          onClick={onReorganise}
          className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors hidden sm:block"
          title="Reorganise Tree (Recalculate Spacing)"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Branch Navigator */}
        <button
          onClick={onOpenNavigator}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          title="Search / Navigate Family Branches"
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Find Person</span>
        </button>

        {/* Add Child under Root quick button */}
        <button
          onClick={onOpenAddChildRoot}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
          title="Add Son under Starting Grandfather"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Son</span>
        </button>

        {/* Save button */}
        <button
          onClick={onManualSave}
          className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
          title="Save Family Tree"
        >
          <Save className="w-4 h-4" />
        </button>

        {/* Export button */}
        <button
          onClick={onOpenExport}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-colors"
          title="Export as PNG / JPG"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
