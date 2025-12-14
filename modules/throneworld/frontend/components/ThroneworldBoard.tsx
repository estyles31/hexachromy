// /modules/throneworld/frontend/components/ThroneworldBoard.tsx
import { useMemo } from "react";
import StaticBoardLayer from "../StaticBoardLayer";
import ThroneworldSystemLayer from "./ThroneworldSystemLayer";
import { buildThroneworldBoardView } from "../models/ThroneworldBoardView";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { type ThroneworldBoardGeometry, getHexagonPoints } from "../../shared/models/BoardGeometry.ThroneWorld";
import type InspectContext from "../../../../shared/models/InspectContext";
import type HoveredSystemInfo from "../models/HoveredSystemInfo";
import type { GameAction } from "../../../../shared/models/ApiContexts";

interface Props {
  gameState: ThroneworldGameState;
  boardGeometry: ThroneworldBoardGeometry;
  onInspect?: (context: InspectContext<HoveredSystemInfo> | null) => void;
  legalActions?: GameAction[];
  onExecuteAction?: (action: GameAction) => void;
  activeParameterSelection?: {
    parameterName: string;
    highlightedHexes?: string[];
    onHexSelected: (hexId: string) => void;  
  };  
}

export default function ThroneworldBoard({ 
  gameState, 
  boardGeometry, 
  onInspect,
  legalActions = [],
  onExecuteAction,
  activeParameterSelection,
}: Props) {
  const playerColors = useMemo(
    () => Object.fromEntries(
      Object.entries(gameState.players).map(([uid, player]) => [uid, player.color])
    ),
    [gameState.players]
  );

  const boardView = useMemo(
    () => buildThroneworldBoardView({
      game: gameState,
      boardGeometry,
      playerColors,
    }),
    [gameState, boardGeometry, playerColors]
  );

  // Extract hex-select actions and build a map of hexId -> action
  const hexSelectActions = useMemo(() => {
    const actions = legalActions.filter(a => a.renderHint?.category === "hex-select");
    const actionMap = new Map<string, GameAction>();
    
    for (const action of actions) {
      // Each hex-select action should have a hexId property
      if ('hexId' in action && typeof action.hexId === 'string') {
        actionMap.set(action.hexId, action);
      }
    }
    
    return actionMap;
  }, [legalActions]);

  // Build set of highlighted hexes
  const highlightedHexes = useMemo(() => {
    // If there's an active parameter selection, use those highlighted hexes
    if (activeParameterSelection?.highlightedHexes) {
      return new Set(activeParameterSelection.highlightedHexes);
    }

    const hexes = new Set<string>();
    for (const action of legalActions) {
      if (action.renderHint?.category === 'hex-select' && action.renderHint.highlightHexes) {
        for (const hexId of action.renderHint.highlightHexes) {
          hexes.add(hexId);
        }
      }
    }
    return hexes;
  }, [legalActions]);

  const handleHexClick = (hexId: string) => {
    // If there's an active parameter selection, use that callback
    if (activeParameterSelection) {
      activeParameterSelection.onHexSelected(hexId);
      return;
    }

    const action = hexSelectActions.get(hexId);
    if (action && onExecuteAction) {
      onExecuteAction(action);
    }
  };

  return (
    <>
      <StaticBoardLayer gameState={gameState} boardGeometry={boardGeometry} />
      
      {/* Highlight overlay for selectable hexes */}
      {highlightedHexes.size > 0 && (
        <g className="hex-highlights">
          {Array.from(highlightedHexes).map(hexId => {
            const hex = boardGeometry.hexes[hexId];
            if (!hex) return null;
            
            const { x, y } = hex;
            const r = boardGeometry.hexRadius;
            
            return (
              <polygon
                key={hexId}
                points={getHexagonPoints(x, y, r)}
                fill="yellow"
                opacity={0.3}
                stroke="yellow"
                strokeWidth={3}
                style={{ cursor: 'pointer' }}
                onClick={() => handleHexClick(hexId)}
              />
            );
          })}
        </g>
      )}
      
      <ThroneworldSystemLayer 
        boardView={boardView}
        onInspect={onInspect}
        onHexClick={handleHexClick}
        clickableHexes={hexSelectActions}
      />
    </>
  );
}