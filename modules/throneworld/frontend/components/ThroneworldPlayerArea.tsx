import "../../../../frontend/src/pages/ui/PlayerArea.css";

type PlayerSummary = {
  id: string;
  name?: string;
  race?: string;
};

type ThroneworldSystem = {
  hexId?: string;
  worldType?: string;
  details?: { owner?: string | null };
};

type ThroneworldPlayerAreaProps = {
  gameState: any;
};

export function ThroneworldPlayerArea({ gameState }: ThroneworldPlayerAreaProps) {
  const players: PlayerSummary[] = Array.isArray(gameState.players)
    ? gameState.players
    : Array.isArray(gameState.playerIds)
      ? gameState.playerIds.map((id: string) => ({ id, name: id }))
      : [];

  const playerStatuses =
    gameState && typeof gameState.playerStatuses === "object" && gameState.playerStatuses !== null
      ? (gameState.playerStatuses as Record<string, string>)
      : {};

  const systems =
    gameState && typeof gameState.systems === "object" && gameState.systems !== null
      ? (Object.values(gameState.systems) as ThroneworldSystem[])
      : [];

  const playerViewSystems =
    gameState?.playerView && typeof gameState.playerView === "object" && gameState.playerView?.systems
      ? (gameState.playerView.systems as Record<string, ThroneworldSystem>)
      : {};

  const resolveDetails = (system: ThroneworldSystem) => system?.details ?? playerViewSystems?.[system?.hexId ?? ""];

  const calculateVictoryPoints = (playerId: string) => {
    let total = 0;
    let controlsThroneworld = false;

    systems.forEach(system => {
      const details = resolveDetails(system);
      if (!details || details.owner !== playerId) return;

      total += 1;
      if (String(system.worldType ?? "").toLowerCase() === "throneworld") {
        controlsThroneworld = true;
      }
    });

    if (controlsThroneworld) total += 5;
    return total;
  };

  const raceMapping =
    gameState?.options?.races && typeof gameState.options.races === "object"
      ? (gameState.options.races as Record<string, string>)
      : null;

  return (
    <div className="player-area">
      <h3 className="player-area__title">Players</h3>
      {players.map(player => {
        const vp = calculateVictoryPoints(player.id);
        const status = playerStatuses[player.id] ?? "joined";
        const race = raceMapping?.[player.id] ?? player.race ?? "Unknown";

        return (
          <div className="player-panel" key={player.id}>
            <div className="player-name">{player.name ?? player.id}</div>
            <div className="player-meta">Race: {race}</div>
            <div className="player-meta">Victory Points: {vp}</div>
            <div className="player-status">Status: {status}</div>
          </div>
        );
      })}
    </div>
  );
}
