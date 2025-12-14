import "./BoardCanvas.css";
import { useState, useRef } from "react";
import type { FrontendModuleDefinition } from "../../../../modules/FrontendModuleDefinition";
import type InspectContext from "../../../../shared/models/InspectContext";
import type { GameState } from "../../../../shared/models/GameState";
import { useLegalActions } from "../../../../shared-frontend/hooks/useLegalActions";
import { useActionExecutor } from "../../hooks/useActionExecutor";

interface Props<S, I> {
  gameState: GameState<S>;
  module: FrontendModuleDefinition<S, I>;
  onInspect?: (context: InspectContext<I> | null) => void;
  onActionTaken: () => void;
  activeParameterSelection?: {
    parameterName: string;
    highlightedHexes?: string[];
    onHexSelected: (hexId: string) => void;
  };
}

export default function BoardCanvas<S, I>({
  gameState,
  module,
  onInspect,
  onActionTaken,
  activeParameterSelection,
}: Props<S, I>) {
  const geometry = module.getBoardGeometry(gameState);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Fetch legal actions for the current player
  const { legalActions } = useLegalActions(gameState.gameId, gameState.version);
  const { executeAction } = useActionExecutor(gameState.gameId, gameState.version, onActionTaken);

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

    // Check if we clicked on an interactive game element (counter, unit, etc)
    const target = e.target as Element;

    // Check if we're inside a nested SVG element (SystemMarker counters)
    const isSVGElement = target instanceof SVGElement;
    const isNestedSVG = isSVGElement && 
                        target.ownerSVGElement && 
                        target.ownerSVGElement.parentElement?.tagName === 'g';

    // Check if we're inside a nested SVG (SystemMarker) or an interactive element
    const isInteractiveElement =
      target.classList.contains('game-object') ||
      target.classList.contains('system-circle') ||
      target.closest('.game-object') !== null ||
      target.closest('.system-circle') !== null ||
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

  return (
    <div className="board-viewport">
      <div className="board-controls">
        <button onClick={handleZoomIn} title="Zoom In" className="zoom-btn">+</button>
        <button onClick={handleZoomReset} title="Reset View" className="zoom-btn">⟲</button>
        <button onClick={handleZoomOut} title="Zoom Out" className="zoom-btn">−</button>
        <span className="zoom-label">{Math.round(scale * 100)}%</span>
      </div>

      <div
        ref={containerRef}
        className={`board-container ${isDragging ? 'dragging' : ''}`}
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
            width={geometry.width}
            height={geometry.height}
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            style={{
              display: 'block',
            }}
          >
            {module.MainBoardComponent
              && <module.MainBoardComponent gameState={gameState} boardGeometry={geometry} onInspect={onInspect}
                                legalActions={legalActions?.actions} onExecuteAction={executeAction}
                                activeParameterSelection={activeParameterSelection} />
            }
          </svg>
        </div>
      </div>
    </div>
  );
}
