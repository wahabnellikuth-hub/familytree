import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface EditPersonModalProps {
  isOpen: boolean;
  initialName: string;
  isPlaceholder?: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void;
}

export const EditPersonModal: React.FC<EditPersonModalProps> = ({
  isOpen,
  initialName,
  isPlaceholder,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState<string>('');

  useEffect(() => {
    setName(isPlaceholder ? '' : initialName);
  }, [initialName, isPlaceholder, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <h3 className="font-semibold text-slate-800 text-sm">
            {isPlaceholder ? 'Convert Placeholder to Person' : 'Edit Person Name'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Person Name (Male Lineage Descendant)
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
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
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-md shadow-sm transition-colors flex items-center"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

