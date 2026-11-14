import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FamilyTreeData, LayoutMode, SaveStatus, Person, BranchDirection } from './types';
import { calculateTreeLayout } from './utils/layoutEngine';
import {
  addChildren,
  addEmptyPlaceholder,
  convertPlaceholder,
  updatePersonName,
  deletePerson,
  reorderChildren,
  movePerson,
  toggleBranchCollapse,
  setPersonBranchDirection,
  getDescendantIds,
  getAncestorIds,
  countSubtreeDescendants,
} from './utils/treeOperations';
import { getTree, saveTree, getLastActiveTreeId, setLastActiveTreeId } from './utils/db';
import { createSampleFamilyTree } from './utils/sampleData';
import { Header } from './components/Header';
import { TreeView } from './components/TreeView';
import { SelectedPersonPanel } from './components/SelectedPersonPanel';
import { WelcomeDashboard } from './components/WelcomeDashboard';
import { AddChildrenModal } from './components/AddChildrenModal';
import { EditPersonModal } from './components/EditPersonModal';
import { ReorderSiblingsModal } from './components/ReorderSiblingsModal';
import { MovePersonModal } from './components/MovePersonModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ExportModal } from './components/ExportModal';
import { BranchNavigatorModal } from './components/BranchNavigatorModal';

export const App: React.FC = () => {
  const [activeTree, setActiveTree] = useState<FamilyTreeData | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  // Selected person & focused branch state
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [focusedBranchId, setFocusedBranchId] = useState<string | null>(null);

  // Undo / Redo history
  const [undoStack, setUndoStack] = useState<FamilyTreeData[]>([]);
  const [redoStack, setRedoStack] = useState<FamilyTreeData[]>([]);

  // Modals state
  const [addChildTargetId, setAddChildTargetId] = useState<string | null>(null);
  const [editPersonTargetId, setEditPersonTargetId] = useState<string | null>(null);
  const [reorderTargetId, setReorderTargetId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isNavigatorModalOpen, setIsNavigatorModalOpen] = useState<boolean>(false);

  // Check last active tree on mount
  useEffect(() => {
    async function init() {
      try {
        const lastId = await getLastActiveTreeId();
        if (lastId) {
          const loaded = await getTree(lastId);
          if (loaded) {
            setActiveTree(loaded);
          }
        }
      } catch (err) {
        console.error('Failed to init last active tree:', err);
      }
    }
    init();
  }, []);

  // Autosave with debounce
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateTreeState = useCallback(
    (newTree: FamilyTreeData, addToHistory: boolean = true) => {
      if (addToHistory && activeTree) {
        setUndoStack((prev) => [...prev.slice(-25), activeTree]);
        setRedoStack([]);
      }

      setActiveTree(newTree);
      setSaveStatus('unsaved');

      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }

      autosaveTimeoutRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        const success = await saveTree(newTree);
        setSaveStatus(success ? 'saved' : 'error');
      }, 600);
    },
    [activeTree]
  );

  // Manual save
  const handleManualSave = async () => {
    if (!activeTree) return;
    setSaveStatus('saving');
    const success = await saveTree(activeTree);
    setSaveStatus(success ? 'saved' : 'error');
  };

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !activeTree) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, activeTree]);
    setActiveTree(previous);
    saveTree(previous);
  }, [undoStack, activeTree]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !activeTree) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, activeTree]);
    setActiveTree(next);
    saveTree(next);
  }, [redoStack, activeTree]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        setSelectedPersonId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Layout calculation
  const layoutResult = useMemo(() => {
    if (!activeTree) {
      return {
        nodes: [],
        lines: [],
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      };
    }
    try {
      return calculateTreeLayout(activeTree, {
        layoutMode: activeTree.layoutMode,
        focusPersonId: focusedBranchId,
      });
    } catch (err) {
      console.error('Layout computation error:', err);
      return {
        nodes: [],
        lines: [],
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      };
    }
  }, [activeTree, focusedBranchId]);

  // Highlighted branch IDs (selected person, their descendants, and ancestor path)
  const highlightedIds = useMemo(() => {
    if (!activeTree || !selectedPersonId) return new Set<string>();
    const descendants = getDescendantIds(activeTree.people, selectedPersonId);
    const ancestors = getAncestorIds(activeTree.people, selectedPersonId);
    return new Set<string>([selectedPersonId, ...descendants, ...ancestors]);
  }, [activeTree, selectedPersonId]);

  // Dashboard handlers
  const handleOpenTree = async (id: string) => {
    const loaded = await getTree(id);
    if (loaded) {
      setActiveTree(loaded);
      setSelectedPersonId(null);
      setFocusedBranchId(null);
      setUndoStack([]);
      setRedoStack([]);
      await setLastActiveTreeId(id);
    }
  };

  const handleCreateNewTree = async (title: string, grandfatherName: string) => {
    const rootId = `p_root_${Date.now()}`;
    const newTreeId = `tree_${Date.now()}`;
    const now = Date.now();

    const newTree: FamilyTreeData = {
      id: newTreeId,
      title,
      rootPersonId: rootId,
      people: {
        [rootId]: {
          id: rootId,
          name: grandfatherName,
          parentId: null,
          childrenIds: [],
          generation: 1,
        },
      },
      layoutMode: 'vertical',
      collapsedBranchIds: [],
      createdAt: now,
      updatedAt: now,
    };

    await saveTree(newTree);
    setActiveTree(newTree);
    setSelectedPersonId(null);
    setFocusedBranchId(null);
    setUndoStack([]);
    setRedoStack([]);
  };

  const handleLoadSample = async () => {
    const sample = createSampleFamilyTree();
    await saveTree(sample);
    setActiveTree(sample);
    setSelectedPersonId(null);
    setFocusedBranchId(null);
    setUndoStack([]);
    setRedoStack([]);
  };

  const handleImportTree = async (importedTree: FamilyTreeData) => {
    await saveTree(importedTree);
    setActiveTree(importedTree);
    setSelectedPersonId(null);
    setFocusedBranchId(null);
    setUndoStack([]);
    setRedoStack([]);
  };

  // Tree mutations
  const handleAddChildrenConfirm = (names: string[], isPlaceholder: boolean) => {
    if (!activeTree || !addChildTargetId) return;
    const updated = addChildren(activeTree, addChildTargetId, names, isPlaceholder);
    updateTreeState(updated);
  };

  const handleAddEmptyBoxQuick = (fatherId: string) => {
    if (!activeTree) return;
    const updated = addEmptyPlaceholder(activeTree, fatherId);
    updateTreeState(updated);
  };

  const handleEditNameConfirm = (newName: string) => {
    if (!activeTree || !editPersonTargetId) return;
    const person = activeTree.people[editPersonTargetId];
    if (person?.isPlaceholder) {
      const updated = convertPlaceholder(activeTree, editPersonTargetId, newName);
      updateTreeState(updated);
    } else {
      const updated = updatePersonName(activeTree, editPersonTargetId, newName);
      updateTreeState(updated);
    }
  };

  const handleReorderConfirm = (newOrderIds: string[]) => {
    if (!activeTree || !reorderTargetId) return;
    const updated = reorderChildren(activeTree, reorderTargetId, newOrderIds);
    updateTreeState(updated);
  };

  const handleMoveConfirm = (newFatherId: string) => {
    if (!activeTree || !moveTargetId) return;
    const result = movePerson(activeTree, moveTargetId, newFatherId);
    if (result.success) {
      updateTreeState(result.tree);
    } else {
      alert(result.error || 'Failed to move person.');
    }
  };

  const handleDeleteConfirm = (deleteSubtree: boolean) => {
    if (!activeTree || !deleteTargetId) return;
    const updated = deletePerson(activeTree, deleteTargetId, deleteSubtree);
    if (selectedPersonId === deleteTargetId) {
      setSelectedPersonId(null);
    }
    updateTreeState(updated);
  };

  const handleToggleCollapse = (personId: string) => {
    if (!activeTree) return;
    const updated = toggleBranchCollapse(activeTree, personId);
    updateTreeState(updated, false); // Collapsing is view-state, doesn't need undo history
  };

  const handleChangeLayoutMode = (mode: LayoutMode) => {
    if (!activeTree) return;
    const updated: FamilyTreeData = {
      ...activeTree,
      layoutMode: mode,
      updatedAt: Date.now(),
    };
    updateTreeState(updated);
  };

  const handleUpdateTreeTitle = (newTitle: string) => {
    if (!activeTree) return;
    const updated: FamilyTreeData = {
      ...activeTree,
      title: newTitle,
      updatedAt: Date.now(),
    };
    updateTreeState(updated);
  };

  const handleChangeFont = (font: string) => {
    if (!activeTree) return;
    const updated: FamilyTreeData = {
      ...activeTree,
      fontFamily: font,
      updatedAt: Date.now(),
    };
    updateTreeState(updated);
  };

  const handleChangeBranchDirection = (personId: string, direction: BranchDirection) => {
    if (!activeTree) return;
    const updated = setPersonBranchDirection(activeTree, personId, direction);
    updateTreeState(updated);
  };

  // If no tree is currently open, show the Welcome Dashboard
  if (!activeTree) {
    return (
      <WelcomeDashboard
        onOpenTree={handleOpenTree}
        onCreateTree={handleCreateNewTree}
        onLoadSampleTree={handleLoadSample}
        onImportTree={handleImportTree}
      />
    );
  }

  const focusedBranchPerson = focusedBranchId ? activeTree.people[focusedBranchId] : null;
  const deleteTargetPerson = deleteTargetId ? activeTree.people[deleteTargetId] : null;
  const deleteDescendantCount = deleteTargetId
    ? countSubtreeDescendants(activeTree.people, deleteTargetId)
    : 0;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50">
      {/* Top Header & Toolbar */}
      <Header
        treeTitle={activeTree.title}
        onUpdateTreeTitle={handleUpdateTreeTitle}
        layoutMode={activeTree.layoutMode}
        onChangeLayoutMode={handleChangeLayoutMode}
        currentFont={activeTree.fontFamily || 'Noto Sans Malayalam'}
        onChangeFont={handleChangeFont}
        onReorganise={() => {
          // Trigger slight state nudge to force fresh tidy tree recalculation
          setActiveTree({ ...activeTree });
        }}
        saveStatus={saveStatus}
        onManualSave={handleManualSave}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenAddChildRoot={() => setAddChildTargetId(activeTree.rootPersonId)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenNavigator={() => setIsNavigatorModalOpen(true)}
        onReturnToDashboard={() => setActiveTree(null)}
        focusedBranchName={focusedBranchPerson?.name || null}
        onExitBranchFocus={() => setFocusedBranchId(null)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Interactive Drawing Canvas */}
        <TreeView
          layoutResult={layoutResult}
          rootPersonId={focusedBranchId || activeTree.rootPersonId}
          selectedPersonId={selectedPersonId}
          highlightedIds={highlightedIds}
          fontFamily={activeTree.fontFamily}
          onSelectPerson={setSelectedPersonId}
          onAddChildren={(id) => setAddChildTargetId(id)}
          onToggleCollapse={handleToggleCollapse}
          onOpenActions={(id) => setSelectedPersonId(id)}
        />

        {/* Selected Person Side Panel */}
        {selectedPersonId && activeTree.people[selectedPersonId] && (
          <SelectedPersonPanel
            tree={activeTree}
            personId={selectedPersonId}
            isFocusedBranch={focusedBranchId === selectedPersonId}
            onClose={() => setSelectedPersonId(null)}
            onAddChildren={(id) => setAddChildTargetId(id)}
            onAddEmptyBox={handleAddEmptyBoxQuick}
            onEditName={(id) => setEditPersonTargetId(id)}
            onToggleFocusBranch={(id) => {
              setFocusedBranchId((prev) => (prev === id ? null : id));
            }}
            onReorderChildren={(id) => setReorderTargetId(id)}
            onMovePerson={(id) => setMoveTargetId(id)}
            onDeletePerson={(id) => setDeleteTargetId(id)}
            onToggleCollapse={handleToggleCollapse}
            onChangeBranchDirection={handleChangeBranchDirection}
          />
        )}
      </div>

      {/* Add Children Modal */}
      {addChildTargetId && activeTree.people[addChildTargetId] && (
        <AddChildrenModal
          isOpen={true}
          fatherName={activeTree.people[addChildTargetId].name}
          onClose={() => setAddChildTargetId(null)}
          onConfirm={handleAddChildrenConfirm}
        />
      )}

      {/* Edit Person Name / Convert Placeholder Modal */}
      {editPersonTargetId && activeTree.people[editPersonTargetId] && (
        <EditPersonModal
          isOpen={true}
          initialName={activeTree.people[editPersonTargetId].name}
          isPlaceholder={activeTree.people[editPersonTargetId].isPlaceholder}
          onClose={() => setEditPersonTargetId(null)}
          onConfirm={handleEditNameConfirm}
        />
      )}

      {/* Reorder Siblings Modal */}
      {reorderTargetId && activeTree.people[reorderTargetId] && (
        <ReorderSiblingsModal
          isOpen={true}
          fatherName={activeTree.people[reorderTargetId].name}
          children={activeTree.people[reorderTargetId].childrenIds
            .map((cid) => activeTree.people[cid])
            .filter((p): p is Person => p !== undefined)}
          onClose={() => setReorderTargetId(null)}
          onConfirm={handleReorderConfirm}
        />
      )}

      {/* Move Person to Another Father Modal */}
      {moveTargetId && activeTree.people[moveTargetId] && (
        <MovePersonModal
          tree={activeTree}
          personId={moveTargetId}
          isOpen={true}
          onClose={() => setMoveTargetId(null)}
          onConfirm={handleMoveConfirm}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && deleteTargetPerson && (
        <DeleteConfirmModal
          isOpen={true}
          person={deleteTargetPerson}
          descendantCount={deleteDescendantCount}
          onClose={() => setDeleteTargetId(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {/* Dedicated High-Res Image Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          tree={activeTree}
          selectedPersonId={selectedPersonId}
          isOpen={true}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* Family Branch Navigator Modal */}
      {isNavigatorModalOpen && (
        <BranchNavigatorModal
          tree={activeTree}
          isOpen={true}
          onClose={() => setIsNavigatorModalOpen(false)}
          onSelectPerson={(id) => {
            setSelectedPersonId(id);
          }}
        />
      )}
    </div>
  );
};
