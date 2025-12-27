// /modules/throneworld/frontend/components/ThroneworldBoard.tsx
import { useMemo, useCallback } from "react";
import StaticBoardLayer from "../StaticBoardLayer";
import ThroneworldSystemLayer from "./ThroneworldSystemLayer";
import { buildThroneworldBoardView } from "../models/ThroneworldBoardView";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { type ThroneworldBoardGeometry, getHexagonPoints } from "../../shared/models/BoardGeometry.ThroneWorld";
import type InspectContext from "../../../../shared/models/InspectContext";
import type HoveredSystemInfo from "../models/HoveredSystemInfo";
import { useSelection } from "../../../../shared-frontend/contexts/SelectionContext";
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";

interface Props {
  boardGeometry: ThroneworldBoardGeometry;
  onInspect?: (context: InspectContext<HoveredSystemInfo> | null) => void;
}

export default function ThroneworldBoard({
  boardGeometry,
  onInspect,
}: Props) {
  const gameState = useGameStateContext() as ThroneworldGameState;
  const { selection, select, selectableBoardSpaces } = useSelection();

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

  // Handle hex click
  const handleHexClick = useCallback((hexId: string) => {
    if (selectableBoardSpaces.has(hexId)) {
      select({
        type: "boardSpace",
        subtype: "hex",
        id: hexId,
      });
    } 
  }, [selectableBoardSpaces, select]);

  // Handle click on empty space
  // const handleBackgroundClick = useCallback(() => {
  //   clearSelection();
  // }, [clearSelection]);

  // Get currently selected hex IDs for highlighting
  const selectedHexIds = useMemo(() => {
    const hexes = new Set<string>();
    for (const item of selection.items) {
      if (item.type === "boardSpace" && item.subtype === "hex") {
        hexes.add(item.id);
      } else if (item.metadata?.hexId) {
        hexes.add(item.metadata.hexId as string);
      }
    }
    return hexes;
  }, [selection.items]);

  return (
    <>
      <StaticBoardLayer gameState={gameState} boardGeometry={boardGeometry} />

      {/* Highlight overlay for selectable hexes */}
      {selectableBoardSpaces.size > 0 && (
        <g className="hex-highlights">
          {Array.from(selectableBoardSpaces).map(hexId => {
            const hex = boardGeometry.hexes[hexId];
            if (!hex) return null;

            const { x, y } = hex;
            const r = boardGeometry.hexRadius;
            const isSelected = selectedHexIds.has(hexId);

            return (
              <polygon
                key={`highlight-${hexId}`}
                points={getHexagonPoints(x, y, r)}
                fill={isSelected ? "white" : "yellow"}
                opacity={isSelected ? 0.4 : 0.25}
                stroke={isSelected ? "white" : "yellow"}
                strokeWidth={isSelected ? 4 : 2}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleHexClick(hexId);
                }}
              />
            );
          })}
        </g>
      )}

      {/* Selection indicators */}
      {selectedHexIds.size > 0 && (
        <g className="selection-indicators">
          {Array.from(selectedHexIds).map(hexId => {
            const hex = boardGeometry.hexes[hexId];
            if (!hex) return null;

            return (
              <polygon
                key={`selected-${hexId}`}
                points={getHexagonPoints(hex.x, hex.y, boardGeometry.hexRadius)}
                fill="none"
                stroke="white"
                strokeWidth={3}
                strokeDasharray="8,4"
                pointerEvents="none"
              />
            );
          })}
        </g>
      )}

      <ThroneworldSystemLayer
        boardView={boardView}
        onInspect={onInspect}
      />
    </>
  );
}