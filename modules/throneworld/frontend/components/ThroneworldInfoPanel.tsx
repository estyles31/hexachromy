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
  const phase = gameState?.phase ?? "—";
  const currentPlayer = gameState?.currentPlayer ?? "—";
  const players = Array.isArray(gameState?.players) ? gameState.players : [];
  const raceMapping =
    gameState?.options?.races && typeof gameState.options.races === "object"
      ? (gameState.options.races as Record<string, string>)
      : {};
  const playerNameById = players.reduce<Record<string, string>>((acc, player) => {
    if (player?.id) acc[player.id] = player.name ?? player.id;
    return acc;
  }, {});
  const playerRaceById = players.reduce<Record<string, string>>((acc, player) => {
    if (player?.id) {
      const race = player.race ?? raceMapping[player.id];
      if (race) acc[player.id] = race;
    }
    return acc;
  }, { ...raceMapping });

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

  return (
    <div className="info-panel">
      <div className="info-section">
        <div className="info-title">Phase</div>
        <div className="info-value">{phase}</div>
        <div className="info-subtitle">Current Player</div>
        <div className="info-value">{currentPlayer}</div>
      </div>

      <div className="info-section">
        <div className="info-title">Hovered System</div>
        <div className="info-value">{hoveredSystem?.hexId ?? "—"}</div>

        <div className="info-subtitle">Development</div>
        <div className="info-value">{isRevealed ? hoveredDetails?.dev ?? "—" : hoveredSystem ? "Unknown" : "—"}</div>

        <div className="info-subtitle">Owner</div>
        <div className="info-value">{ownerLabel}</div>

        <div className="info-subtitle">Fleets</div>
        <div className="info-value">
          {isRevealed ? formatUnitSummary(hoveredDetails?.spaceUnits) : hoveredSystem ? "Unknown" : "—"}
        </div>

        <div className="info-subtitle">Ground Units</div>
        <div className="info-value">
          {isRevealed ? formatUnitSummary(hoveredDetails?.groundUnits) : hoveredSystem ? "Unknown" : "—"}
        </div>
      </div>
    </div>
  );
}
