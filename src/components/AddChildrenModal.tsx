import React, { useState } from 'react';
import { Plus, Trash2, X, Check, BoxSelect } from 'lucide-react';

interface AddChildrenModalProps {
  fatherName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (names: string[], isPlaceholder: boolean) => void;
}

export const AddChildrenModal: React.FC<AddChildrenModalProps> = ({
  fatherName,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [names, setNames] = useState<string[]>(['']);
  const [isPlaceholder, setIsPlaceholder] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleNameChange = (index: number, value: string) => {
    const updated = [...names];
    updated[index] = value;
    setNames(updated);
  };

  const handleAddAnother = () => {
    setNames([...names, '']);
  };

  const handleRemoveName = (index: number) => {
    if (names.length === 1) {
      setNames(['']);
      return;
    }
    const updated = names.filter((_, i) => i !== index);
    setNames(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlaceholder) {
      // Add empty placeholder count
      const count = Math.max(names.length, 1);
      const placeholderNames = Array(count).fill('Empty Box (Reserved)');
      onConfirm(placeholderNames, true);
      onClose();
      setNames(['']);
      return;
    }

    const filtered = names.map((n) => n.trim()).filter((n) => n.length > 0);
    if (filtered.length === 0) return;

    onConfirm(filtered, false);
    onClose();
    setNames(['']);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Add Children to Lineage</h3>
            <p className="text-xs text-slate-500 mt-0.5">Father: <span className="font-medium text-slate-700">{fatherName}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Mode Switch: Named sons vs Empty Placeholders */}
          <div className="flex items-center space-x-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
            <input
              type="checkbox"
              id="placeholderToggle"
              checked={isPlaceholder}
              onChange={(e) => setIsPlaceholder(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
            />
            <label htmlFor="placeholderToggle" className="text-xs text-slate-700 cursor-pointer flex items-center">
              <BoxSelect className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>Create as optional <strong>Empty Placeholder Boxes</strong> (for future editing)</span>
            </label>
          </div>

          {!isPlaceholder ? (
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              <label className="block text-xs font-medium text-slate-600">
                Children's Names (Male descendants in paternal lineage)
              </label>

              {names.map((name, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-slate-400 w-5 text-right">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    autoFocus={index === names.length - 1}
                    value={name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    placeholder={`e.g. Son ${index + 1}`}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveName(index)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove this name"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddAnother}
                className="mt-2 w-full flex items-center justify-center py-1.5 px-3 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md border border-sky-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span>Add Another Name</span>
              </button>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
              <p className="font-semibold">Adding {names.length} Reserved Placeholder Box(es)</p>
              <p className="mt-1 text-[11px] text-amber-700 leading-relaxed">
                Empty boxes reserve branch space without establishing a confirmed person until you assign a name.
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleAddAnother}
                  className="px-2.5 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-medium border border-amber-300"
                >
                  + Add Another Placeholder Box
                </button>
                {names.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveName(names.length - 1)}
                    className="px-2.5 py-1 text-xs text-amber-700 hover:text-amber-900"
                  >
                    Remove One
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-sm transition-colors flex items-center"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Confirm & Add</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

