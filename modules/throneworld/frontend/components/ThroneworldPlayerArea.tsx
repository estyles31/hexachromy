import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { getProductionForPlayer } from "../../shared/models/Production.ThroneWorld";

export default function ThroneworldPlayerArea({
  gameState,
  playerId,
}: {
  gameState: ThroneworldGameState;
  playerId: string;
}) {
  const player = gameState.players[playerId];
  if (!player) return null;

  const production = getProductionForPlayer(gameState.state, playerId);

  return (
    <div
      className="tw-player-extra"
      style={{
        backgroundColor: player.color,
        padding: "6px 8px",
        borderRadius: 4,
        marginTop: 4,
        color: "#111",
      }}
    >
      <div className="tw-faction-name" style={{ fontWeight: "bold" }}>
        {player.race}
      </div>

      <div className="tw-resources">
        Resources: {player.resources}
      </div>

      <div className="tw-production">
        Production: +{production}
      </div>
    </div>
  );
}


