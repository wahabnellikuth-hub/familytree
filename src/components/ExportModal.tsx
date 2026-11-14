import React, { useState } from 'react';
import { X, Download, FileImage, Check } from 'lucide-react';
import { FamilyTreeData } from '../types';
import { exportTreeImage, ExportOptions } from '../utils/exportImage';
import { calculateTreeLayout } from '../utils/layoutEngine';

interface ExportModalProps {
  tree: FamilyTreeData;
  selectedPersonId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  tree,
  selectedPersonId,
  isOpen,
  onClose,
}) => {
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [scale, setScale] = useState<number>(2); // Default 2x for print-quality
  const [scope, setScope] = useState<'complete' | 'branch'>('complete');
  const [excludePlaceholders, setExcludePlaceholders] = useState<boolean>(false);
  const [includeTitle, setIncludeTitle] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Selected branch focus person
  const focusId = scope === 'branch' && selectedPersonId ? selectedPersonId : null;
  const branchPerson = focusId ? tree.people[focusId] : null;

  // Estimate dimensions
  const layout = calculateTreeLayout(tree, {
    layoutMode: tree.layoutMode,
    focusPersonId: focusId,
    excludePlaceholders,
  });

  const estimatedWidth = Math.round(layout.bounds.width * scale);
  const estimatedHeight = Math.round((layout.bounds.height + (includeTitle ? 60 : 0)) * scale);

  const handleExport = async () => {
    setIsExporting(true);
    setStatusMessage(null);

    const options: ExportOptions = {
      format,
      scale,
      quality: 0.95,
      backgroundColor: '#ffffff',
      excludePlaceholders,
      focusPersonId: focusId,
      includeTitle,
    };

    // Small delay to allow UI spinner
    setTimeout(async () => {
      const result = await exportTreeImage(tree, options);
      setIsExporting(false);
      if (result.success) {
        setStatusMessage('Family tree image exported successfully!');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMessage(result.error || 'Export failed.');
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2 text-slate-800">
            <FileImage className="w-4 h-4 text-sky-600" />
            <h3 className="font-semibold text-sm">Export Family Tree Image</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Form */}
        <div className="p-5 space-y-4">
          {/* Format selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Image Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('png')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                  format === 'png'
                    ? 'border-sky-600 bg-sky-50 text-sky-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                PNG (Lossless, High Sharpness)
              </button>
              <button
                type="button"
                onClick={() => setFormat('jpeg')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                  format === 'jpeg'
                    ? 'border-sky-600 bg-sky-50 text-sky-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                JPG / JPEG (Standard Image)
              </button>
            </div>
          </div>

          {/* Resolution / DPI Scaling */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Export Resolution & Quality
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScale(1)}
                className={`py-1.5 px-2 text-xs rounded-lg border text-center transition-all ${
                  scale === 1
                    ? 'border-sky-600 bg-sky-50 text-sky-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Standard (1x)
              </button>
              <button
                type="button"
                onClick={() => setScale(2)}
                className={`py-1.5 px-2 text-xs rounded-lg border text-center transition-all ${
                  scale === 2
                    ? 'border-sky-600 bg-sky-50 text-sky-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Print High-Res (2x)
              </button>
              <button
                type="button"
                onClick={() => setScale(3)}
                className={`py-1.5 px-2 text-xs rounded-lg border text-center transition-all ${
                  scale === 3
                    ? 'border-sky-600 bg-sky-50 text-sky-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Poster Ultra (3x)
              </button>
            </div>
          </div>

          {/* Scope selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Export Scope
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('complete')}
                className={`py-1.5 px-3 text-xs rounded-lg border text-center transition-all ${
                  scope === 'complete'
                    ? 'border-sky-600 bg-sky-50 text-sky-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Complete Family Tree
              </button>
              <button
                type="button"
                disabled={!selectedPersonId}
                onClick={() => setScope('branch')}
                className={`py-1.5 px-3 text-xs rounded-lg border text-center transition-all disabled:opacity-40 disabled:hover:bg-transparent ${
                  scope === 'branch'
                    ? 'border-sky-600 bg-sky-50 text-sky-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
                title={selectedPersonId ? `Export ${branchPerson?.name}'s branch` : 'Select a person first'}
              >
                Selected Branch Only
              </button>
            </div>
            {scope === 'branch' && branchPerson && (
              <p className="text-[11px] text-sky-700 mt-1">
                Exporting branch starting from: <strong>{branchPerson.name}</strong>
              </p>
            )}
          </div>

          {/* Additional Options */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={excludePlaceholders}
                onChange={(e) => setExcludePlaceholders(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
              />
              <span>Exclude empty placeholder boxes from exported image</span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTitle}
                onChange={(e) => setIncludeTitle(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
              />
              <span>Include family title header and generation summary</span>
            </label>
          </div>

          {/* Dimension preview info box */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex justify-between items-center">
            <span>Estimated Image Resolution:</span>
            <span className="font-mono font-semibold text-slate-800">
              {estimatedWidth} × {estimatedHeight} px
            </span>
          </div>

          {statusMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs font-medium flex items-center space-x-2 ${
                statusMessage.includes('successfully')
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExport}
              className="px-4 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generating High-Res Image...' : `Download ${format.toUpperCase()}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
