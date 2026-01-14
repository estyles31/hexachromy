// /modules/throneworld/frontend/components/ThroneworldBoard.tsx
import { useMemo, useCallback } from "react";
import StaticBoardLayer from "../StaticBoardLayer";
import ThroneworldSystemLayer from "./ThroneworldSystemLayer";
import { buildThroneworldBoardView } from "../models/ThroneworldBoardView";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { type ThroneworldBoardGeometry, getHexagonPoints } from "../../shared/models/BoardGeometry.Throneworld";
import type InspectContext from "../../../../shared-frontend/InspectContext";
import type { HoveredInfo } from "../models/HoveredInfo";
import { useSelection } from "../../../../shared-frontend/contexts/SelectionContext";
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";
import UnitCountersLayer from "./UnitCountersLayer";

interface Props {
  boardGeometry: ThroneworldBoardGeometry;
  onInspect?: (context: InspectContext<HoveredInfo> | null) => void;
}

export const neutralColor = "#000";

export default function ThroneworldBoard({ boardGeometry, onInspect }: Props) {
  const gameState = useGameStateContext() as ThroneworldGameState;
  const { filledParams, select, selectableBoardSpaces } = useSelection();

  const playerColors = useMemo(() => {
    const colors = Object.fromEntries(Object.entries(gameState.players).map(([uid, player]) => [uid, player.color]));
    colors["neutral"] = neutralColor;
    return colors;
  }, [gameState.players]);

  const boardView = useMemo(
    () =>
      buildThroneworldBoardView({
        game: gameState,
        boardGeometry,
        playerColors,
      }),
    [gameState, boardGeometry, playerColors]
  );

  // Handle hex click - just pass the hexId
  const handleHexClick = useCallback(
    (hexId: string) => {
      if (selectableBoardSpaces.has(hexId)) {
        select(hexId);
      }
    },
    [selectableBoardSpaces, select]
  );

  // Get currently selected hex IDs for highlighting
  const selectedHexIds = useMemo(() => {
    const hexes = new Set<string>();

    // Check if any filled param value is a hex ID that exists on the board
    for (const value of Object.values(filledParams)) {
      if (typeof value === "string" && boardGeometry.hexes[value]) {
        hexes.add(value);
      }
    }

    return hexes;
  }, [filledParams, boardGeometry.hexes]);

  return (
    <>
      <StaticBoardLayer gameState={gameState} boardGeometry={boardGeometry} />

      {/* Highlight overlay for selectable hexes */}
      {selectableBoardSpaces.size > 0 && (
        <g className="hex-highlights">
          {Array.from(selectableBoardSpaces).map((hexId) => {
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
          {Array.from(selectedHexIds).map((hexId) => {
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

      <ThroneworldSystemLayer boardView={boardView} onInspect={onInspect} />
      <UnitCountersLayer boardView={boardView} onInspect={onInspect} />
    </>
  );
}
