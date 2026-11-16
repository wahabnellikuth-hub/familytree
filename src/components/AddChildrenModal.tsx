import React, { useState } from 'react';
import { Plus, Trash2, X, Check, BoxSelect, FileText, UserPlus } from 'lucide-react';

export interface ChildFormEntry {
  name: string;
  isExtraNote: boolean;
  extraNote: string;
  showNoteField: boolean;
}

interface AddChildrenModalProps {
  fatherName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    items: Array<{ name: string; isExtraNote?: boolean; extraNote?: string }>,
    isPlaceholder: boolean
  ) => void;
}

export const AddChildrenModal: React.FC<AddChildrenModalProps> = ({
  fatherName,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [entries, setEntries] = useState<ChildFormEntry[]>([
    { name: '', isExtraNote: false, extraNote: '', showNoteField: false },
  ]);
  const [modalMode, setModalMode] = useState<'standard' | 'extraNote' | 'placeholder'>('standard');

  if (!isOpen) return null;

  const handleNameChange = (index: number, value: string) => {
    const updated = [...entries];
    updated[index].name = value;
    setEntries(updated);
  };

  const handleExtraNoteChange = (index: number, value: string) => {
    const updated = [...entries];
    updated[index].extraNote = value;
    setEntries(updated);
  };

  const handleToggleEntryType = (index: number) => {
    const updated = [...entries];
    updated[index].isExtraNote = !updated[index].isExtraNote;
    if (updated[index].isExtraNote) {
      updated[index].showNoteField = true;
    }
    setEntries(updated);
  };

  const handleToggleNoteField = (index: number) => {
    const updated = [...entries];
    updated[index].showNoteField = !updated[index].showNoteField;
    setEntries(updated);
  };

  const handleAddSon = () => {
    setEntries([
      ...entries,
      { name: '', isExtraNote: false, extraNote: '', showNoteField: false },
    ]);
  };

  const handleAddExtraNotePerson = () => {
    setEntries([
      ...entries,
      { name: '', isExtraNote: true, extraNote: '', showNoteField: true },
    ]);
  };

  const handleRemoveEntry = (index: number) => {
    if (entries.length === 1) {
      setEntries([{ name: '', isExtraNote: false, extraNote: '', showNoteField: false }]);
      return;
    }
    const updated = entries.filter((_, i) => i !== index);
    setEntries(updated);
  };

  const handleModeChange = (mode: 'standard' | 'extraNote' | 'placeholder') => {
    setModalMode(mode);
    if (mode === 'extraNote') {
      // Switch all entries to extra note with breaking line
      setEntries((prev) =>
        prev.map((e) => ({ ...e, isExtraNote: true, showNoteField: true }))
      );
    } else if (mode === 'standard') {
      // Switch all entries to standard son
      setEntries((prev) =>
        prev.map((e) => ({ ...e, isExtraNote: false }))
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (modalMode === 'placeholder') {
      const count = Math.max(entries.length, 1);
      const placeholderItems = Array(count).fill({ name: 'Empty Box (Reserved)' });
      onConfirm(placeholderItems, true);
      onClose();
      resetForm();
      return;
    }

    const filtered = entries
      .map((entry) => ({
        name: entry.name.trim(),
        isExtraNote: entry.isExtraNote,
        extraNote: entry.extraNote.trim() || undefined,
      }))
      .filter((entry) => entry.name.length > 0 || (entry.extraNote && entry.extraNote.length > 0));

    if (filtered.length === 0) return;

    onConfirm(filtered, false);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setEntries([{ name: '', isExtraNote: false, extraNote: '', showNoteField: false }]);
    setModalMode('standard');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Add Children & Notes to Lineage</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Father: <span className="font-semibold text-slate-700">{fatherName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Quick Option Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => handleModeChange('standard')}
              className={`py-1.5 px-2 rounded-md font-medium flex items-center justify-center space-x-1.5 transition-all ${
                modalMode === 'standard'
                  ? 'bg-white text-sky-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sons (Solid)</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('extraNote')}
              className={`py-1.5 px-2 rounded-md font-medium flex items-center justify-center space-x-1.5 transition-all ${
                modalMode === 'extraNote'
                  ? 'bg-white text-amber-700 shadow-xs font-semibold ring-1 ring-amber-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Add extra notes or persons with dashed breaking lines (-------) for easy visual identification"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>Extra Note (---)</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('placeholder')}
              className={`py-1.5 px-2 rounded-md font-medium flex items-center justify-center space-x-1.5 transition-all ${
                modalMode === 'placeholder'
                  ? 'bg-white text-slate-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BoxSelect className="w-3.5 h-3.5" />
              <span>Empty Box</span>
            </button>
          </div>

          {/* Mode explanation banner */}
          {modalMode === 'extraNote' && (
            <div className="px-3 py-2 bg-amber-50/90 rounded-lg border border-amber-200 text-[11.5px] text-amber-800 flex items-start space-x-2">
              <span className="font-mono font-bold text-amber-600">-------</span>
              <p className="leading-tight">
                <strong>Extra Notes / Special Person:</strong> Styled with a distinct breaking line (<code className="bg-amber-100 px-1 py-0.2 rounded text-[10.5px]">-------</code>) to easily identify them from main lineage sons.
              </p>
            </div>
          )}

          {modalMode !== 'placeholder' ? (
            <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
              <label className="block text-xs font-medium text-slate-600">
                Children & Extra Notes under {fatherName}:
              </label>

              {entries.map((entry, index) => (
                <div
                  key={index}
                  className={`p-2.5 rounded-lg border transition-all space-y-2 ${
                    entry.isExtraNote
                      ? 'bg-amber-50/50 border-dashed border-amber-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Top row: Index, Type Pill, Name Input, Actions */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-slate-400 w-4 text-center">
                      {index + 1}.
                    </span>

                    {/* Breaking Line Type Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleEntryType(index)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center space-x-1 ${
                        entry.isExtraNote
                          ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                      }`}
                      title={
                        entry.isExtraNote
                          ? 'Extra Note/Person with breaking line (-------). Click to change to regular Son.'
                          : 'Regular Son. Click to change to Extra Note/Person (breaking line -------).'
                      }
                    >
                      <span>{entry.isExtraNote ? '------- Note -------' : 'Son'}</span>
                    </button>

                    {/* Name Input */}
                    <input
                      type="text"
                      autoFocus={index === entries.length - 1}
                      value={entry.name}
                      onChange={(e) => handleNameChange(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (index === entries.length - 1 && entry.name.trim()) {
                            handleAddSon();
                          }
                        }
                      }}
                      placeholder={
                        entry.isExtraNote
                          ? 'e.g. Fatima (Daughter) / Note Title'
                          : `e.g. Son ${index + 1} / മകൻ ${index + 1}`
                      }
                      className={`flex-1 px-2.5 py-1.5 text-xs bg-white rounded-md focus:outline-none focus:ring-2 border font-sans ${
                        entry.isExtraNote
                          ? 'border-dashed border-amber-400 focus:ring-amber-500 focus:border-amber-500'
                          : 'border-slate-300 focus:ring-sky-500 focus:border-sky-500'
                      }`}
                    />

                    {/* Toggle Extra Note Field Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleNoteField(index)}
                      className={`p-1.5 rounded-md text-xs transition-colors ${
                        entry.showNoteField || entry.extraNote
                          ? 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Add or edit extra note / remark (displayed under breaking line -------)"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>

                    {/* Remove row */}
                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(index)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove this item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Breaking Line & Note Details Input */}
                  {entry.showNoteField && (
                    <div className="pl-6 pt-1 space-y-1">
                      {/* Visual breaking line like ------- */}
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                        <span className="flex-1 border-t border-dashed border-slate-300" />
                        <span className="px-1 text-slate-400 font-sans text-[9.5px]">breaking line (-------)</span>
                        <span className="flex-1 border-t border-dashed border-slate-300" />
                      </div>

                      <input
                        type="text"
                        value={entry.extraNote}
                        onChange={(e) => handleExtraNoteChange(index, e.target.value)}
                        placeholder="Extra note / remark (e.g. Born 1960, Dubai branch, Daughter info)"
                        className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-dashed border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 italic text-slate-700"
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Add buttons row */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddSon}
                  className="flex items-center justify-center py-1.5 px-3 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md border border-sky-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  <span>+ Add Son</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddExtraNotePerson}
                  className="flex items-center justify-center py-1.5 px-3 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md border border-dashed border-amber-300 transition-colors"
                  title="Add extra note / person with breaking line -------"
                >
                  <span className="font-mono font-bold mr-1 text-amber-600">---</span>
                  <span>+ Add Extra Note (---)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-2">
              <p className="font-semibold flex items-center">
                <BoxSelect className="w-4 h-4 mr-1.5 text-amber-700" />
                Adding {entries.length} Reserved Placeholder Box(es)
              </p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Empty boxes reserve branch space without establishing a confirmed person until you assign a name.
              </p>
              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleAddSon}
                  className="px-2.5 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-medium border border-amber-300"
                >
                  + Add Another Placeholder Box
                </button>
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveEntry(entries.length - 1)}
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
              <span>Confirm & Add to Tree</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
