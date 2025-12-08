import "./PlayerArea.css";

type PlayerSummary = {
  id: string;
  name?: string;
  race?: string;
};

export default function PlayerArea({ gameState }: { gameState: any }) {
  const players: PlayerSummary[] = Array.isArray(gameState.players)
    ? gameState.players
    : gameState && typeof gameState.players === "object" && !Array.isArray(gameState.players)
      ? (Object.values(gameState.players) as PlayerSummary[])
      : Array.isArray(gameState.playerIds)
        ? gameState.playerIds.map((id: string) => ({ id, name: id }))
        : [];

  return (
    <div className="player-area">
      <h3 className="player-area__title">Players</h3>
      {players.map(player => {
        const status = (player as { status?: string }).status ?? "joined";
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
