import { useCallback, useMemo, useState } from "react";
import "../../../../frontend/src/pages/ui/InfoPanel.css";
import type { HoveredSystemInfo } from "../../../../frontend/src/modules/types";

function formatUnitSummary(units: Record<string, number> | undefined): string {
  if (!units) return "None";

  const entries = Object.entries(units).filter(([, count]) => typeof count === "number" && count > 0);
  if (entries.length === 0) return "None";

  return entries.map(([id, count]) => `${id}×${count}`).join(", ");
}

type ThroneworldInfoPanelProps = {
  gameState: any;
  hoveredSystem: HoveredSystemInfo | null;
};

export function ThroneworldInfoPanel({ gameState, hoveredSystem }: ThroneworldInfoPanelProps) {
  const [showSystemDetails, setShowSystemDetails] = useState(true);
  const phase = gameState?.phase ?? "—";
  const players = Array.isArray(gameState?.players) ? gameState.players : [];
  const raceMapping =
    gameState?.options?.races && typeof gameState.options.races === "object"
      ? (gameState.options.races as Record<string, string>)
      : {};
  const systems =
    gameState && typeof gameState.systems === "object" && gameState.systems !== null
      ? (Object.values(gameState.systems) as Array<{ hexId?: string; worldType?: string; details?: Record<string, unknown> }>)
      : [];
  const playerViewSystems =
    gameState?.playerView && typeof gameState.playerView === "object" && gameState.playerView?.systems
      ? (gameState.playerView.systems as Record<string, { details?: Record<string, unknown> }>)
      : {};

  const resolveDetails = useCallback(
    (system: { hexId?: string; details?: Record<string, unknown> }) =>
      system?.details ?? playerViewSystems?.[system?.hexId ?? ""],
    [playerViewSystems],
  );

  const playerNameById = players.reduce<Record<string, string>>((acc, player) => {
    if (player?.id) acc[player.id] = (player as { displayName?: string }).displayName ?? player.name ?? player.id;
    return acc;
  }, {});
  const playerRaceById = players.reduce<Record<string, string>>((acc, player) => {
    if (player?.id) {
      const race = player.race ?? raceMapping[player.id];
      if (race) acc[player.id] = race;
    }
    return acc;
  }, { ...raceMapping });

  const playerVictoryPoints = useMemo(() => {
    const totals: Record<string, number> = {};

    systems.forEach(system => {
      const details = resolveDetails(system);
      const owner = details?.owner as string | undefined;
      if (!owner) return;

      totals[owner] = (totals[owner] ?? 0) + 1;
      if (String(system.worldType ?? "").toLowerCase() === "throneworld") {
        totals[owner] += 5;
      }
    });

    return totals;
  }, [resolveDetails, systems]);

  const hoveredDetails = (hoveredSystem?.details ?? null) as
    | {
        dev?: number;
        owner?: string | null;
        spaceUnits?: Record<string, number>;
        groundUnits?: Record<string, number>;
      }
    | null;

  const isRevealed = hoveredSystem?.revealed;
  const ownerId = hoveredDetails?.owner ?? null;
  const ownerRace = ownerId ? playerRaceById[ownerId] : undefined;
  const ownerName = ownerId ? playerNameById[ownerId] ?? ownerId : undefined;

  const ownerLabel = isRevealed
    ? ownerId
      ? ownerId === "neutral"
        ? "Neutral"
        : `${ownerRace ?? "Unknown"} (${ownerName ?? ownerId})`
      : hoveredSystem
        ? "Unclaimed"
        : "—"
    : hoveredSystem
      ? "Unknown"
      : "—";

  const playerColors = useMemo(
    () => ["#65c3ff", "#a6d189", "#f2cdcd", "#e5c890", "#c6a0f6", "#8bd5ca"],
    [],
  );

  const currentPlayerId = gameState?.currentPlayer ?? "—";
  const currentPlayerLabel = playerNameById[currentPlayerId] ?? currentPlayerId ?? "—";

  return (
    <>
      <div className="info-panel">
        <div className="info-section">
          <div className="info-title">Phase</div>
          <div className="info-value">{phase}</div>
          <div className="info-subtitle">Current Player</div>
          <div className="info-value">{currentPlayerLabel}</div>
        </div>

        <div className="info-section">
          <div className="info-title">Players</div>
          <div className="player-list">
            {players.map((player: { id: string; name?: string }, index: number) => {
              const color = playerColors[index % playerColors.length];
              const race = playerRaceById[player.id] ?? "Unknown";
              const vp = playerVictoryPoints[player.id] ?? 0;
              const name = playerNameById[player.id] ?? player.id;
              return (
                <div className="player-row" key={player.id}>
                  <span className="player-swatch" style={{ backgroundColor: color }} />
                  <div className="player-row__details">
                    <div className="player-row__name">{name}</div>
                    <div className="player-row__meta">Race: {race}</div>
                    <div className="player-row__meta">Victory Points: {vp}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <label className="info-toggle info-toggle--sidebar">
          <input
            type="checkbox"
            checked={showSystemDetails}
            onChange={event => setShowSystemDetails(event.target.checked)}
          />
          Show hovered system details
        </label>
      </div>

      {showSystemDetails ? (
        <div className="hovered-system-inset">
          <div className="info-section info-section--inset">
            <div className="info-title">Hovered System</div>
            <div className="info-value">{hoveredSystem?.hexId ?? "—"}</div>
            <div className="info-grid" style={{ marginTop: 8 }}>
              <div>
                <div className="info-subtitle">Development</div>
                <div className="info-value">{isRevealed ? hoveredDetails?.dev ?? "—" : hoveredSystem ? "Unknown" : "—"}</div>
              </div>
              <div>
                <div className="info-subtitle">Owner</div>
                <div className="info-value">{ownerLabel}</div>
              </div>
              <div>
                <div className="info-subtitle">Fleets</div>
                <div className="info-value">
                  {isRevealed ? formatUnitSummary(hoveredDetails?.spaceUnits) : hoveredSystem ? "Unknown" : "—"}
                </div>
              </div>
              <div>
                <div className="info-subtitle">Ground Units</div>
                <div className="info-value">
                  {isRevealed ? formatUnitSummary(hoveredDetails?.groundUnits) : hoveredSystem ? "Unknown" : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
