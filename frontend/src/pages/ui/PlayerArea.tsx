import "./PlayerArea.css";

type PlayerSummary = {
  id: string;
  name?: string;
  race?: string;
};

export default function PlayerArea({ gameState }: { gameState: any }) {
  const players: PlayerSummary[] = Array.isArray(gameState.players)
    ? gameState.players
    : Array.isArray(gameState.playerIds)
      ? gameState.playerIds.map((id: string) => ({ id, name: id }))
      : [];

  const playerStatuses =
    gameState && typeof gameState.playerStatuses === "object" && gameState.playerStatuses !== null
      ? (gameState.playerStatuses as Record<string, string>)
      : {};

  return (
    <div className="player-area">
      <h3 className="player-area__title">Players</h3>
      {players.map(player => {
        const status = playerStatuses[player.id] ?? "joined";
        const race = player.race;

        return (
          <div className="player-panel" key={player.id}>
            <div className="player-name">{player.name ?? player.id}</div>
            {race ? <div className="player-meta">Race: {race}</div> : null}
            <div className="player-status">Status: {status}</div>
          </div>
        );
      })}
    </div>
  );
}
