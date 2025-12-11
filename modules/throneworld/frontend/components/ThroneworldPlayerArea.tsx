// /modules/throneworld/frontend/components/ThroneworldPlayerArea.tsx
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { getProductionForPlayer } from "../../shared/models/Production.ThroneWorld";
import { Factions, type FactionID } from "../../shared/models/Factions.ThroneWorld";
import "./ThroneworldPlayerArea.css";

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
      <div className="tw-row">
        <div className="tw-faction-name" style={{ fontWeight: "bold" }}>
          {Factions[player.race as FactionID].Name}
        </div>
        {player.tech && (
          <div className="tw-tech-row">
            <div className="tw-tech-item" title="Ground Technology">
              <span className="tw-tech-icon">⚔️</span>
              <span className="tw-tech-value">{player.tech.Ground}</span>
            </div>
            <div className="tw-tech-item" title="Space Technology">
              <span className="tw-tech-icon">🚀</span>
              <span className="tw-tech-value">{player.tech.Space}</span>
            </div>
            <div className="tw-tech-item" title="Jump Technology">
              <span className="tw-tech-icon">⚡</span>
              <span className="tw-tech-value">{player.tech.Jump}</span>
            </div>
            <div className="tw-tech-item" title="Communication Technology">
              <span className="tw-tech-icon">📡</span>
              <span className="tw-tech-value">{player.tech.Comm}</span>
            </div>
          </div>
        )}
      </div>

      <div className="tw-row">
        <div className="tw-resources">
          Resources: {player.resources}
        </div>

        <div className="tw-production">
          Production: +{production}
        </div>
      </div>
    </div>
  );
}