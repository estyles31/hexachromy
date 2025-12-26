import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";

export default function ThroneworldGameInfoArea({
}: {
}) {
  const gameState = useGameStateContext() as ThroneworldGameState;
  const currentPlayers = gameState.state.currentPlayers ?? [];
  const cpLbl = currentPlayers.length == 1 ? "Current Player" : "Current Players";
  const showCP = currentPlayers.length > 0;

  const cpStr = currentPlayers.map((p) => gameState.players[p].displayName).join(", ");

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

      {showCP && (<div className="tw-current-player">
        {cpLbl}: {cpStr}
      </div>)}
    </div>
  );
}


