// /modules/throneworld/frontend/components/ThroneworldPlayerArea.tsx
import type { ThroneworldGameState, ThroneworldPlayerState } from "../../shared/models/GameState.Throneworld";
import { getEffectiveLevel, TECH_GLYPHS, TechCategory } from "../../shared/models/Tech.Throneworld";
import { Factions, type FactionID } from "../../shared/models/Factions.Throneworld";
import "./ThroneworldPlayerArea.css";
import { useGameStateContext, usePlayers } from "../../../../shared-frontend/contexts/GameStateContext";
import { useMemo } from "react";
import { getProductionForPlayer } from "../../shared/models/Production.Throneworld";
import { Glyph } from "../../../../shared-frontend/glyphs/Glyph";

export default function ThroneworldPlayerArea({ playerId }: { playerId: string }) {
  // Get player from Players context (only re-renders when players change)
  const players = usePlayers();
  const player = players[playerId] as ThroneworldPlayerState;

  // Get systems for production calculation
  const gameState = useGameStateContext() as ThroneworldGameState;

  if (!player) return null;

  const production = useMemo(() => getProductionForPlayer(gameState, playerId), [gameState.state.systems, playerId]);
  const techSize = 28;
  const resourceSize = 24;

  function TechGlyph({ tech, bgColor }: { tech: TechCategory; bgColor: string }) {
    return (
      <Glyph glyph={TECH_GLYPHS[tech]} host="html" backgroundColor={bgColor} outlineStyle="double-bg" size={techSize} />
    );
  }

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
        <div className="tw-faction-name">{Factions[player.race as FactionID]?.Name}</div>
        <div className="tw-row-left">
          <div className="tw-resources">
            <Glyph glyph={TECH_GLYPHS.Resources} host="html" backgroundColor={player.color} size={resourceSize} />{" "}
            {player.resources}
            <span className="tw-production">(+{production})</span>
          </div>
        </div>
      </div>

      <div className="tw-row-left">
        {player.tech && (
          <div className="tw-tech-row">
            <div className="tw-tech-item" title="Ground Technology">
              <span className="tw-tech-icon">
                <TechGlyph tech="Ground" bgColor={player.color} />
              </span>
              <span className="tw-tech-value">{getEffectiveLevel(player.tech.Ground)}</span>
            </div>
            <div className="tw-tech-item" title="Space Technology">
              <span className="tw-tech-icon">
                <TechGlyph tech="Space" bgColor={player.color} />
              </span>
              <span className="tw-tech-value">{getEffectiveLevel(player.tech.Space)}</span>
            </div>
            <div className="tw-tech-item" title="Jump Technology">
              <TechGlyph tech="Jump" bgColor={player.color} />
              <span className="tw-tech-value">{getEffectiveLevel(player.tech.Jump)}</span>
            </div>
            <div className="tw-tech-item" title="Communication Technology">
              <TechGlyph tech="Comm" bgColor={player.color} />
              <span className="tw-tech-value">{getEffectiveLevel(player.tech.Comm)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
