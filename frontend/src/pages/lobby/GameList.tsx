import type { GameSummary } from "../../../../shared/models/GameSummary";
import "./GameList.css";

export function GameList({
  games,
  loading,
  error,
  onSelect,
}: {
  games: GameSummary[];
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
          className="game-list-item"
          onClick={() => onSelect(game.id)}
        >
          <strong>{game.name}</strong>
          <div className="meta">
            {game.gameType} — {game.status}
          </div>
          <div className="players">
            {game.players.map(p => p.name ?? p.id).join(", ")}
          </div>
        </li>
      ))}
    </ul>
  );
}
