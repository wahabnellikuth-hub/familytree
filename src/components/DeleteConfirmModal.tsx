import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { Person } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  person: Person | null;
  descendantCount: number;
  onClose: () => void;
  onConfirm: (deleteSubtree: boolean) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  person,
  descendantCount,
  onClose,
  onConfirm,
}) => {
  const [deleteSubtree, setDeleteSubtree] = useState<boolean>(true);

  if (!isOpen || !person) return null;

  const hasDescendants = descendantCount > 0;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-red-50/60">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <h3 className="font-semibold text-sm">Confirm Deletion</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-700 leading-relaxed">
            Are you sure you want to delete <strong className="text-slate-900">{person.name}</strong> from the family tree?
          </p>

          {hasDescendants && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-2">
              <p className="font-semibold text-amber-800">
                Warning: This person has {descendantCount} descendant(s) below them!
              </p>
              <div className="space-y-1.5 pt-1">
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteChoice"
                    checked={deleteSubtree}
                    onChange={() => setDeleteSubtree(true)}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <span>
                    <strong>Delete Entire Branch:</strong> Permanently delete {person.name} and all {descendantCount} descendants below him.
                  </span>
                </label>

                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteChoice"
                    checked={!deleteSubtree}
                    onChange={() => setDeleteSubtree(false)}
                    className="mt-0.5 text-sky-600 focus:ring-sky-500"
                  />
                  <span>
                    <strong>Delete Person Only:</strong> Retain all {descendantCount} descendants by re-attaching his sons directly to their grandfather.
                  </span>
                </label>
              </div>
            </div>
          )}

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
              onClick={() => {
                onConfirm(deleteSubtree);
                onClose();
              }}
              className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition-colors flex items-center"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Confirm Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

