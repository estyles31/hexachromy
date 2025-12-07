import type { HoveredSystemInfo } from "../../modules/types";

export default function InfoPanel({ gameState, hoveredSystem }: { gameState: any; hoveredSystem: HoveredSystemInfo | null }) {
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

  const details = hoveredSystem?.details;
  const owner = (details as { owner?: unknown } | undefined)?.owner;
  const ownerLabel = typeof owner === "string" ? owner : owner === null ? "Unclaimed" : "—";

  const details = hoveredSystem?.details;
  const owner = (details as { owner?: unknown } | undefined)?.owner;
  const ownerLabel = typeof owner === "string" ? owner : owner === null ? "Unclaimed" : "—";

  const details = hoveredSystem?.details;
  const owner = (details as { owner?: unknown } | undefined)?.owner;
  const ownerLabel = typeof owner === "string" ? owner : owner === null ? "Unclaimed" : "—";

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

        <div className="info-subtitle">Owner</div>
        <div className="info-value">{hoveredSystem ? ownerLabel : "—"}</div>

        <div className="info-subtitle">Details</div>
        <div className="info-value">
          {hoveredSystem ? (
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {details ? JSON.stringify(details, null, 2) : "None"}
            </pre>
          ) : (
            "—"
          )}
        </div>
      </div>
    </div>
  );
}
