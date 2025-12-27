// /frontend/src/pages/game/BoardCanvas.tsx
import { useRef, useState } from "react";
import type InspectContext from "../../../../shared/models/InspectContext";
import "./BoardCanvas.css";
import type { FrontendModuleDefinition } from "../../../../shared-frontend/FrontendModuleDefinition";
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";

interface Props {
  module: FrontendModuleDefinition;
  onInspect?: (context: InspectContext<unknown> | null) => void;
}

export default function BoardCanvas({
  module,
  onInspect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const gameState = useGameStateContext();
  const boardGeometry = module.getBoardGeometry(gameState);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.3));
  };

  const handleZoomReset = () => {
    setScale(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with primary button (left click)
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;

    // ignore clicks from floating UI
    if (target.closest('.ui-overlay')) {
      return;
    }

    // Check if we're inside a nested SVG element (SystemMarker counters)
    const isSVGElement = target instanceof SVGElement;
    const isNestedSVG = isSVGElement &&
      target.ownerSVGElement &&
      target.ownerSVGElement.parentElement?.tagName === 'g';

    // Check if we're inside a nested SVG or an interactive element
    const isInteractiveElement =
      target.classList.contains('game-object') ||
      target.closest('.game-object') !== null ||
      isNestedSVG;

    // Only initiate drag if we're clicking on background or main board elements
    if (isInteractiveElement) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    onInspect?.(null);
  };

  if (!module) {
    return <div>Unknown game type</div>;
  }

  const MainBoardComponent = module.MainBoardComponent;

  if (!MainBoardComponent) {
    return <div>No board component for this game</div>;
  }

  return (
    <div className="board-viewport">
      <div className="board-controls">
        <button onClick={handleZoomIn} title="Zoom In" className="zoom-btn">+</button>
        {/* <button onClick={handleZoomReset} title="Reset View" className="zoom-btn">⟲</button> */}
        <button onClick={handleZoomOut} title="Zoom Out" className="zoom-btn">-</button>
        <span className="zoom-label">{Math.round(scale * 100)}%</span>
      </div>

      <div
        ref={containerRef}
        className={`board-pan-surface ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="board-transform-wrapper"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          <svg
            width={boardGeometry.width}
            height={boardGeometry.height}
            viewBox={`0 0 ${boardGeometry.width} ${boardGeometry.height}`}
            style={{
              display: 'block',
            }}
          >
            <MainBoardComponent
              boardGeometry={boardGeometry}
              onInspect={onInspect}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}