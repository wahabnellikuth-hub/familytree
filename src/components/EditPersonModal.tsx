import React, { useState, useEffect } from 'react';
import { X, Check, FileText } from 'lucide-react';

interface EditPersonModalProps {
  isOpen: boolean;
  initialName: string;
  isPlaceholder?: boolean;
  initialIsExtraNote?: boolean;
  initialExtraNote?: string;
  onClose: () => void;
  onConfirm: (newName: string, isExtraNote?: boolean, extraNote?: string) => void;
}

export const EditPersonModal: React.FC<EditPersonModalProps> = ({
  isOpen,
  initialName,
  isPlaceholder,
  initialIsExtraNote = false,
  initialExtraNote = '',
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState<string>('');
  const [isExtraNote, setIsExtraNote] = useState<boolean>(false);
  const [extraNote, setExtraNote] = useState<string>('');

  useEffect(() => {
    setName(isPlaceholder ? '' : initialName);
    setIsExtraNote(Boolean(initialIsExtraNote));
    setExtraNote(initialExtraNote || '');
  }, [initialName, isPlaceholder, initialIsExtraNote, initialExtraNote, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), isExtraNote, extraNote.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              {isPlaceholder ? 'Convert Placeholder to Person' : 'Edit Person & Notes'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Update name, breaking line style, or extra remarks</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Person Name / Label
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name / പേര് നൽകുക"
              className={`w-full px-3 py-2 text-sm bg-white rounded-md focus:outline-none focus:ring-2 border font-sans ${
                isExtraNote
                  ? 'border-dashed border-amber-400 focus:ring-amber-500'
                  : 'border-slate-300 focus:ring-sky-500'
              }`}
            />
          </div>

          {/* Toggle for Extra Note / Breaking Line Style */}
          <div className="p-3 bg-amber-50/70 rounded-lg border border-dashed border-amber-300 space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="extraNoteToggle"
                checked={isExtraNote}
                onChange={(e) => setIsExtraNote(e.target.checked)}
                className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4"
              />
              <label htmlFor="extraNoteToggle" className="text-xs font-semibold text-amber-900 cursor-pointer flex items-center">
                <span>Mark as Extra Note / Person (Dashed line <code className="bg-amber-100 px-1 py-0.2 rounded font-mono">-------</code>)</span>
              </label>
            </div>
            <p className="text-[11px] text-amber-700 leading-tight pl-6">
              Draws this box with a dashed breaking line (<code className="bg-amber-100 px-1 py-0.2 rounded font-mono">-------</code>) to easily distinguish extra notes, daughters, or special remarks from main lineage sons.
            </p>
          </div>

          {/* Extra Note / Remark details */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Extra Note Text (displayed under breaking line -------)
              </span>
              <span className="text-[10px] text-slate-400">Optional</span>
            </label>

            {/* Visual breaking line preview */}
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mb-1.5">
              <span className="flex-1 border-t border-dashed border-slate-300" />
              <span className="px-1 text-slate-400 font-sans text-[9.5px]">breaking line (-------)</span>
              <span className="flex-1 border-t border-dashed border-slate-300" />
            </div>

            <textarea
              rows={2}
              value={extraNote}
              onChange={(e) => setExtraNote(e.target.value)}
              placeholder="e.g. Born 1960 • Branch moved to Dubai • Daughter"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans text-slate-800"
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
