import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TreeLayoutResult } from '../types';
import { PersonBox } from './PersonBox';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Map as MapIcon } from 'lucide-react';

interface TreeViewProps {
  layoutResult: TreeLayoutResult;
  rootPersonId: string;
  selectedPersonId: string | null;
  highlightedIds: Set<string>;
  onSelectPerson: (id: string | null) => void;
  onAddChildren: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onOpenActions: (id: string) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({
  layoutResult,
  rootPersonId,
  selectedPersonId,
  highlightedIds,
  onSelectPerson,
  onAddChildren,
  onToggleCollapse,
  onOpenActions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showMinimap, setShowMinimap] = useState<boolean>(true);

  // Center/Fit to screen
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const { width: treeWidth, height: treeHeight } = layoutResult.bounds;

    if (treeWidth <= 0 || treeHeight <= 0) return;

    const padding = 80;
    const scaleX = (clientWidth - padding) / treeWidth;
    const scaleY = (clientHeight - padding) / treeHeight;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 1.4);

    const newX = (clientWidth - treeWidth * newScale) / 2;
    const newY = Math.max((clientHeight - treeHeight * newScale) / 2, 40);

    setScale(newScale);
    setPosition({ x: newX, y: newY });
  }, [layoutResult.bounds]);

  // Initial fit on mount
  useEffect(() => {
    fitToScreen();
  }, [fitToScreen]);

  // Center on selected person smoothly
  const panToPerson = useCallback(
    (personId: string) => {
      if (!containerRef.current) return;
      const targetNode = layoutResult.nodes.find((n) => n.id === personId);
      if (!targetNode) return;

      const { clientWidth, clientHeight } = containerRef.current;
      const targetCenterX = targetNode.x + targetNode.width / 2;
      const targetCenterY = targetNode.y + targetNode.height / 2;

      const newX = clientWidth / 2 - targetCenterX * scale;
      const newY = clientHeight / 2 - targetCenterY * scale;

      setPosition({ x: newX, y: newY });
    },
    [layoutResult.nodes, scale]
  );

  // Jump to selected person if selection changes and is not in view
  useEffect(() => {
    if (selectedPersonId) {
      // Check if node exists
      const node = layoutResult.nodes.find((n) => n.id === selectedPersonId);
      if (node && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const screenX = node.x * scale + position.x;
        const screenY = node.y * scale + position.y;
        if (screenX < 50 || screenX > clientWidth - 200 || screenY < 50 || screenY > clientHeight - 100) {
          panToPerson(selectedPersonId);
        }
      }
    }
  }, [selectedPersonId, panToPerson]);

  // Zoom handlers
  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(Math.max(prev + delta, 0.15), 2.5));
  };

  const handleResetZoom = () => {
    setScale(1);
    fitToScreen();
  };

  // Wheel zoom centered on cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setScale((prevScale) => {
      const nextScale = Math.min(Math.max(prevScale * zoomFactor, 0.15), 2.5);
      // Adjust position so mouse point remains stationary
      setPosition((prevPos) => ({
        x: mouseX - (mouseX - prevPos.x) * (nextScale / prevScale),
        y: mouseY - (mouseY - prevPos.y) * (nextScale / prevScale),
      }));
      return nextScale;
    });
  };

  // Drag and Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan support for mobile
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStart) {
      setPosition({
        x: e.touches[0].clientX - touchStart.x,
        y: e.touches[0].clientY - touchStart.y,
      });
    }
  };
  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  // Render Minimap
  const minimapWidth = 180;
  const minimapHeight = 120;
  const treeW = layoutResult.bounds.width || 1;
  const treeH = layoutResult.bounds.height || 1;
  const minimapScale = Math.min((minimapWidth - 16) / treeW, (minimapHeight - 16) / treeH);

  const containerW = containerRef.current?.clientWidth || 800;
  const containerH = containerRef.current?.clientHeight || 600;

  const vpX = (-position.x / scale) * minimapScale + 8;
  const vpY = (-position.y / scale) * minimapScale + 8;
  const vpW = (containerW / scale) * minimapScale;
  const vpH = (containerH / scale) * minimapScale;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => onSelectPerson(null)}
      className="relative w-full h-full overflow-hidden bg-slate-50 cursor-grab active:cursor-grabbing select-none"
    >
      {/* Background grid dots for subtle depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: `${position.x % 24}px ${position.y % 24}px`,
        }}
      />

      {/* Main Scaled & Panned Drawing Layer */}
      <div
        className="absolute transition-transform duration-75 origin-top-left"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale})`,
          width: `${layoutResult.bounds.width}px`,
          height: `${layoutResult.bounds.height}px`,
        }}
      >
        {/* SVG Orthogonal Relationship Lines Layer */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={layoutResult.bounds.width}
          height={layoutResult.bounds.height}
        >
          {layoutResult.lines.map((line) => {
            const isLineHighlighted =
              highlightedIds.has(line.fromId) && highlightedIds.has(line.toId);

            // Construct orthogonal SVG path
            let d = '';
            for (let i = 0; i < line.points.length; i++) {
              d += i === 0 ? `M ${line.points[i].x} ${line.points[i].y} ` : `L ${line.points[i].x} ${line.points[i].y} `;
            }

            return (
              <path
                key={line.id}
                d={d}
                fill="none"
                stroke={isLineHighlighted ? '#0284c7' : '#94a3b8'}
                strokeWidth={isLineHighlighted ? 2.5 : 1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-colors duration-150"
              />
            );
          })}
        </svg>

        {/* Person Boxes Layer */}
        {layoutResult.nodes.map((node) => (
          <PersonBox
            key={node.id}
            node={node}
            isSelected={selectedPersonId === node.id}
            isHighlighted={highlightedIds.has(node.id)}
            isRoot={node.id === rootPersonId}
            onSelect={onSelectPerson}
            onAddChildren={onAddChildren}
            onToggleCollapse={onToggleCollapse}
            onOpenActions={onOpenActions}
          />
        ))}
      </div>

      {/* Viewport Floating Controls Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-lg p-1.5 flex items-center space-x-1 z-30"
      >
        <button
          onClick={() => handleZoom(0.15)}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(-0.15)}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-200 my-auto" />
        <button
          onClick={fitToScreen}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors"
          title="Reset Zoom (100%)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-200 my-auto" />
        <span className="text-[11px] font-semibold text-slate-500 px-1.5 min-w-[36px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setShowMinimap(!showMinimap)}
          className={`p-1.5 rounded-md transition-colors ${
            showMinimap ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Toggle Minimap"
        >
          <MapIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Minimap */}
      {showMinimap && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-5 right-5 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-lg p-2 z-30 select-none hidden sm:block"
          style={{ width: `${minimapWidth}px`, height: `${minimapHeight}px` }}
        >
          <div className="relative w-full h-full bg-slate-50 rounded border border-slate-100 overflow-hidden">
            {/* Miniature nodes */}
            {layoutResult.nodes.map((n) => (
              <div
                key={n.id}
                className={`absolute rounded-[1px] ${
                  n.id === selectedPersonId
                    ? 'bg-sky-600 z-10'
                    : highlightedIds.has(n.id)
                    ? 'bg-amber-500'
                    : n.isPlaceholder
                    ? 'bg-slate-300'
                    : 'bg-slate-400'
                }`}
                style={{
                  left: `${n.x * minimapScale + 8}px`,
                  top: `${n.y * minimapScale + 8}px`,
                  width: `${Math.max(n.width * minimapScale, 4)}px`,
                  height: `${Math.max(n.height * minimapScale, 2.5)}px`,
                }}
              />
            ))}

            {/* Viewport Box */}
            <div
              className="absolute border border-sky-500 bg-sky-500/15 pointer-events-none rounded-[2px]"
              style={{
                left: `${Math.max(vpX, 0)}px`,
                top: `${Math.max(vpY, 0)}px`,
                width: `${Math.min(vpW, minimapWidth)}px`,
                height: `${Math.min(vpH, minimapHeight)}px`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
