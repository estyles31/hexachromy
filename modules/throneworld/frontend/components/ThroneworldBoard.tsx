// /modules/throneworld/frontend/components/ThroneworldBoard.tsx
import { useMemo } from "react";
import StaticBoardLayer from "../StaticBoardLayer";
import ThroneworldSystemLayer from "./ThroneworldSystemLayer";
import { buildThroneworldBoardView } from "../models/ThroneworldBoardView";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type { ThroneworldBoardGeometry } from "../../shared/models/BoardGeometry.ThroneWorld";
import type InspectContext from "../../../../shared/models/InspectContext";
import type HoveredSystemInfo from "../models/HoveredSystemInfo";

interface Props {
  gameState: ThroneworldGameState;
  boardGeometry: ThroneworldBoardGeometry;
  onInspect?: (context: InspectContext<HoveredSystemInfo> | null) => void;
}

export default function ThroneworldBoard({ gameState, boardGeometry, onInspect }: Props) {
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

  return (
    <>
      <StaticBoardLayer gameState={gameState} boardGeometry={boardGeometry} />
      <ThroneworldSystemLayer 
        boardView={boardView}
        onInspect={onInspect}
      />
    </>
  );
}