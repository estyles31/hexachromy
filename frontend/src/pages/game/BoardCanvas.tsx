// /frontend/src/pages/game/BoardCanvas.tsx
import { useRef, useState, useCallback } from "react";
import type { GameState } from "../../../../shared/models/GameState";
import type { BoardGeometry } from "../../../../shared/models/BoardGeometry";
import type InspectContext from "../../../../shared/models/InspectContext";
import type { GameAction } from "../../../../shared/models/ApiContexts";
import { getFrontendModule } from "../../modules/getFrontendModule";
import "./BoardCanvas.css";

interface Props {
  gameState: GameState;
  boardGeometry?: BoardGeometry;
  onInspect?: (context: InspectContext<unknown> | null) => void;
  legalActions?: GameAction[];
  onExecuteAction: (action: GameAction) => void;
}

export default function BoardCanvas({
  gameState,
  boardGeometry,
  onInspect,
  legalActions,
  onExecuteAction,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 800 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const frontendModule = getFrontendModule(gameState.gameType);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;

      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const scaleX = viewBox.width / rect.width;
      const scaleY = viewBox.height / rect.height;

      setViewBox((prev) => ({
        ...prev,
        x: prev.x - dx * scaleX,
        y: prev.y - dy * scaleY,
      }));

      setPanStart({ x: e.clientX, y: e.clientY });
    },
    [isPanning, panStart, viewBox.width, viewBox.height]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const svgX = viewBox.x + (mouseX / rect.width) * viewBox.width;
    const svgY = viewBox.y + (mouseY / rect.height) * viewBox.height;

    const newWidth = viewBox.width * zoomFactor;
    const newHeight = viewBox.height * zoomFactor;

    const newX = svgX - (mouseX / rect.width) * newWidth;
    const newY = svgY - (mouseY / rect.height) * newHeight;

    setViewBox({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });
  }, [viewBox]);

  if (!frontendModule) {
    return <div>Unknown game type</div>;
  }

  const MainBoardComponent = frontendModule.MainBoardComponent;

  if (!MainBoardComponent) {
    return <div>No board component for this game</div>;
  }

  return (
    <div
      ref={containerRef}
      className="board-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
      >
        <MainBoardComponent
          gameState={gameState}
          boardGeometry={boardGeometry}
          onInspect={onInspect}
          legalActions={legalActions}
          onExecuteAction={onExecuteAction}
        />
      </svg>
    </div>
  );
}