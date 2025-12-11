import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";

export default function ThroneworldGameInfoArea({
}: {
}) {
  const gameState = useGameStateContext() as ThroneworldGameState;
  return (
    <div className="tw-game-info"
      style={{
        padding: "6px 8px",
        borderRadius: 4,
        marginTop: 4,
        color: "#ddd",
      }}
    >
      <div className="tw-current-phase" style={{ fontWeight: "bold" }}>
        Current Phase: {gameState.state.currentPhase}
      </div>

      <div className="tw-current-player">
        Current Player: {gameState.state.currentPlayer}
      </div>
    </div>
  );
}


