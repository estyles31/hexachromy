// /frontend/src/pages/game/PlayerArea.tsx
import { memo, useMemo } from "react";
import "./PlayerArea.css";
import type { FrontendModuleDefinition } from "../../../../shared-frontend/FrontendModuleDefinition";
import { usePlayers } from "../../../../shared-frontend/contexts/GameStateContext";
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";

interface Props<State = unknown> {
  module: FrontendModuleDefinition<State>;
}

// Individual player component - only re-renders when THIS player changes
const PlayerPanel = memo(function PlayerPanel<State>({ 
  playerId, 
  player,
  module,
  victoryPoint,
}: {
  playerId: string;
  player: any;
  module: FrontendModuleDefinition<State>;
  victoryPoint: number;
}) {
  return (
    <div className="player-panel">
      <div className="player-area__title">
        <span className="player-name">{player.displayName}</span>
        <span className="player-score">
          <span className="star-icon">★</span>
          {victoryPoint}
        </span>
      </div>
      {module.PlayerAreaComponent &&
        <module.PlayerAreaComponent playerId={playerId} />
      }
    </div>
  );
});

export default function PlayerArea<State>({
  module,
}: Props<State>) {
  // Use context to subscribe to players slice
  const players = usePlayers();
  const gameState = useGameStateContext();

  // Memoize victory points - only recalculate when gameState.state changes
  const victoryPoints = useMemo(
    () => module.getVictoryPoints({ gameState }),
    [gameState.state, module] // Recalc when game state changes
  );

  const playerOrder = useMemo(
    () => gameState.playerOrder.map((id) => players[id]),
    [gameState.playerOrder]
  );

  return (
    <div className="player-area">
      <h3>Players</h3>

      {playerOrder.map((player) => (
        <PlayerPanel
          key={player.uid}
          playerId={player.uid}
          player={player}
          module={module as FrontendModuleDefinition<unknown>}
          victoryPoint={victoryPoints[player.uid] ?? 0}
        />
      ))}
    </div>
  );
}