import React, { useState, useMemo } from 'react';
import { X, Download, FileImage, Check, Sparkles, Printer, ZoomIn, AlertTriangle } from 'lucide-react';
import { FamilyTreeData } from '../types';
import {
  exportTreeImage,
  ExportOptions,
  ExportFormat,
  getSafeExportDimensions,
} from '../utils/exportImage';
import { calculateTreeLayout } from '../utils/layoutEngine';

interface ExportModalProps {
  tree: FamilyTreeData;
  selectedPersonId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  tree,
  selectedPersonId,
  isOpen,
  onClose,
}) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState<number>(4); // Default 4x Ultra HD for razor-sharp zoom
  const [scope, setScope] = useState<'complete' | 'branch'>('complete');
  const [excludePlaceholders, setExcludePlaceholders] = useState<boolean>(false);
  const [includeTitle, setIncludeTitle] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);

  // Selected branch focus person
  const focusId = scope === 'branch' && selectedPersonId ? selectedPersonId : null;
  const branchPerson = focusId ? tree.people[focusId] : null;

  // Estimate dimensions cleanly via memoized layout
  const layout = useMemo(() => {
    if (!isOpen) return null;
    return calculateTreeLayout(tree, {
      layoutMode: tree.layoutMode,
      focusPersonId: focusId,
      excludePlaceholders,
    });
  }, [isOpen, tree, focusId, excludePlaceholders]);

  if (!isOpen || !layout) return null;

  const isVector = format === 'svg' || format === 'pdf';
  const baseWidth = layout.bounds.width;
  const baseHeight = layout.bounds.height + (includeTitle ? 60 : 0);

  const safeDims = getSafeExportDimensions(baseWidth, baseHeight, scale);

  const handleExport = async () => {
    setIsExporting(true);
    setStatusMessage(null);
    setIsError(false);

    const options: ExportOptions = {
      format,
      scale,
      quality: 0.98,
      backgroundColor: '#ffffff',
      excludePlaceholders,
      focusPersonId: focusId,
      includeTitle,
    };

    // Small delay to allow UI spinner to render before heavy canvas work
    setTimeout(async () => {
      const result = await exportTreeImage(tree, options);
      setIsExporting(false);
      if (result.success) {
        setIsError(false);
        if (format === 'svg') {
          const sizeStr = formatFileSize(result.fileSizeBytes);
          setStatusMessage(
            `Infinite-zoom SVG downloaded${sizeStr ? ` (${sizeStr})` : ''}! Zoom in without any quality loss.`
          );
        } else if (format === 'pdf') {
          setStatusMessage('Vector PDF print preview opened. Choose "Save as PDF" for infinite zoom quality.');
        } else {
          const sizeStr = formatFileSize(result.fileSizeBytes);
          setStatusMessage(
            `Exported ${result.width?.toLocaleString()} × ${result.height?.toLocaleString()} px${
              sizeStr ? ` (${sizeStr})` : ''
            } successfully!`
          );
        }
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setIsError(true);
        setStatusMessage(result.error || 'Export failed.');
      }
    }, 80);
  };

  const scaleOptions = [
    { value: 2, label: '2x', sub: 'Standard HD' },
    { value: 4, label: '4x', sub: 'Ultra HD ★' },
    { value: 6, label: '6x', sub: 'Extreme Zoom' },
    { value: 8, label: '8x', sub: 'Max Poster' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2 text-slate-800">
            <FileImage className="w-4 h-4 text-sky-600" />
            <h3 className="font-semibold text-sm">Export Ultra High-Resolution Family Tree</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Form */}
        <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Format selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Download Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('png')}
                className={`py-2 px-3 rounded-lg border text-left transition-all ${
                  format === 'png'
                    ? 'border-sky-600 bg-sky-50 text-sky-900 ring-1 ring-sky-600/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>PNG Picture</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-semibold">
                    Lossless
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Ultra-sharp picture for Photos & Gallery
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('svg')}
                className={`py-2 px-3 rounded-lg border text-left transition-all ${
                  format === 'svg'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>SVG Vector</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">
                    ∞ Zoom
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Zero quality loss at 1000%+ zoom
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`py-2 px-3 rounded-lg border text-left transition-all ${
                  format === 'pdf'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Printer className="w-3 h-3 text-indigo-600" />
                    <span>Vector PDF</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">
                    Print Ready
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Crisp infinite zoom document & printing
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('jpeg')}
                className={`py-2 px-3 rounded-lg border text-left transition-all ${
                  format === 'jpeg'
                    ? 'border-sky-600 bg-sky-50 text-sky-900 ring-1 ring-sky-600/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>JPG Photo</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                    98% Max
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  High-res photo with smaller file size
                </div>
              </button>
            </div>
          </div>

          {/* Resolution / Zoom Quality selector */}
          {isVector ? (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start space-x-2.5">
              <ZoomIn className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900">
                <div className="font-semibold">Infinite Resolution — Zero Blur When Zooming</div>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  {format === 'svg'
                    ? 'SVG uses mathematical vectors instead of pixels. Every name and line stays razor-sharp even at 1,000%+ zoom, with a tiny file size.'
                    : 'Vector PDF prints and zooms at infinite clarity in any PDF viewer or print shop. In the print dialog, choose "Save as PDF".'}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Zoom Sharpness & Pixel Resolution
                </label>
                <span className="text-[10px] text-slate-500">
                  Higher = sharper when zoomed in
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {scaleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScale(opt.value)}
                    className={`py-2 px-2 rounded-lg border text-center transition-all ${
                      scale === opt.value
                        ? 'border-sky-600 bg-sky-50 text-sky-800 ring-1 ring-sky-600/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                title={
                  selectedPersonId
                    ? `Export ${branchPerson?.name}'s branch`
                    : 'Select a person first'
                }
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

          {/* Accurate Output Resolution Preview */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between items-center">
              <span>Output Resolution:</span>
              {isVector ? (
                <span className="font-mono font-semibold text-emerald-700">
                  Infinite Vector ({Math.round(baseWidth)} × {Math.round(baseHeight)} canvas)
                </span>
              ) : (
                <span className="font-mono font-semibold text-slate-800">
                  {safeDims.pixelWidth.toLocaleString()} × {safeDims.pixelHeight.toLocaleString()} px
                  <span className="text-slate-500 font-normal ml-1">
                    ({safeDims.megapixels} MP • {safeDims.effectiveScale}x)
                  </span>
                </span>
              )}
            </div>

            {!isVector && safeDims.wasClamped && (
              <div className="flex items-start space-x-1.5 text-[11px] text-amber-700 pt-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Auto-optimized to <strong>{safeDims.effectiveScale}x</strong> (maximum browser picture size). For unlimited zoom on huge trees, pick <strong>SVG Vector</strong> or <strong>Vector PDF</strong>.
                </span>
              </div>
            )}
          </div>

          {statusMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs font-medium flex items-center space-x-2 ${
                !isError
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
              className={`px-4 py-1.5 text-xs font-medium text-white rounded-md shadow-sm transition-colors flex items-center space-x-1.5 ${
                format === 'svg'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : format === 'pdf'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              {format === 'pdf' ? (
                <Printer className="w-3.5 h-3.5" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>
                {isExporting
                  ? 'Generating Ultra High-Res...'
                  : format === 'svg'
                  ? 'Download Infinite-Zoom SVG'
                  : format === 'pdf'
                  ? 'Save / Print Vector PDF'
                  : `Download ${safeDims.effectiveScale}x ${format.toUpperCase()}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
