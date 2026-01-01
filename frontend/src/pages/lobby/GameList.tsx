import type { EnrichedGameSummary } from "../../../../shared/models/GameSummary";
import "./GameList.css";

export function GameList({
  games,
  loading,
  error,
  onSelect,
}: {
  games: EnrichedGameSummary[];
  loading: boolean;
  error: string | null;
  onSelect: (gameId: string) => void;
}) {
  if (loading) {
    return <div className="game-list__status">Loading games…</div>;
  }

  if (error) {
    return (
      <div className="game-list__status error">
        Failed to load games: {error}
      </div>
    );
  }

  if (!games.length) {
    return <div className="game-list__status">No games found.</div>;
  }

  return (
    <ul className="game-list">
      {games.map(game => (
        <li
          key={game.id}
          className={`game-list-item ${game.isUserTurn ? 'your-turn' : ''}`}
          onClick={() => onSelect(game.id)}
        >
          <div className="game-header">
            <strong>{game.name}</strong>
            {game.isUserTurn && <span className="turn-indicator">⚡ Your turn</span>}
          </div>
          
          <div className="game-meta">
            <span className="game-type">{game.gameType}</span>
            {game.currentPhase && (
              <span className="current-phase">• {game.currentPhase}</span>
            )}
            <span className="status">• {game.status}</span>
          </div>
          
          {game.currentPlayers && game.currentPlayers.length > 0 && (
            <div className="current-players">
              Waiting on: {game.currentPlayers.join(", ")}
            </div>
          )}
          
          <div className="players">
            Players: {game.players.map(p => p.name).join(", ")}
          </div>
        </li>
      ))}
    </ul>
  );
}