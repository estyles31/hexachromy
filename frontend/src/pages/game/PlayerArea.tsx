// /frontend/src/pages/game/PlayerArea.tsx
import "./PlayerArea.css";
import type { GameState } from "../../../../shared/models/GameState";
import type { FrontendModuleDefinition } from "../../../../modules/FrontendModuleDefinition";

interface Props<State = unknown> {
  gameState: GameState<State>;
  module: FrontendModuleDefinition<State>;
}

export default function PlayerArea<State>({
  gameState, module,
}: Props<State>){
  const victoryPoints = module.getVictoryPoints({ gameState });

  return (
    <div className="player-area">
      <h3>Players</h3>

      {Object.entries(gameState.players).map(([playerId, player]) => (
        <div className="player-panel" key={playerId}>
          <div className="player-area__title">
            <span className="player-name">{player.displayName}</span>
            <span className="player-score">
              <span className="star-icon">★</span>
              {victoryPoints[playerId] ?? 0}
            </span>
          </div>
          {
            module.renderPlayerArea?.({gameState, playerId})
          }
        </div>
      ))}
    </div>
  );
}