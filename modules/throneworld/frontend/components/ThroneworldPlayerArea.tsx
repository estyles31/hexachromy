// /modules/throneworld/frontend/components/ThroneworldPlayerArea.tsx
import type { ThroneworldPlayerState, ThroneworldState } from "../../shared/models/GameState.Throneworld";
import { getProductionForPlayer } from "../../shared/models/Production.ThroneWorld";
import { Factions, type FactionID } from "../../shared/models/Factions.ThroneWorld";
import "./ThroneworldPlayerArea.css";
import { usePlayers, useGameSpecificState } from "../../../../shared-frontend/contexts/GameStateContext";
import { memo, useMemo } from "react";

export default memo(function ThroneworldPlayerArea({ playerId }: { playerId: string; }) 
{
  // Get player from Players context (only re-renders when players change)
  const players = usePlayers();
  const player = players[playerId] as ThroneworldPlayerState;
  
  // Get systems for production calculation
  const state = useGameSpecificState<ThroneworldState>();

  if (!player) return null;

  const production = useMemo(
    () => getProductionForPlayer(state, playerId),
    [state.systems, playerId]
  );

  return (
    <div
      className="tw-player-extra"
      style={{
        backgroundColor: player.color,
        padding: "4px 10px 8px 8px",
        borderRadius: 4,
        marginTop: 4,
        color: "#111",
      }}
    >
      <div className="tw-row">
        <div className="tw-faction-name" >
          {Factions[player.race as FactionID]?.Name}
        </div>
        <div className="tw-row-left">
          <div className="tw-resources">
            💰 {player.resources}
          </div>

          <div className="tw-production">
            (+{production})
          </div>
        </div>
      </div>

      <div className="tw-row-left">
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
    </div>
  );
});