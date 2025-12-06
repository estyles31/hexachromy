import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import LoginProfile from "../components/LoginProfile";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { authFetch } from "../utils/authFetch";
import type { GameSummary } from "../../../shared/models/GameSummary";

export default function LobbyPage() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setError("Please sign in to view games.");
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const loadGames = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await authFetch(user, "/api/games");

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load games");
        }

        const data = (await response.json()) as GameSummary[];

        if (!cancelled) {
          setGames(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadGames();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCreateGame = async () => {
    setCreateError(null);
    setCreating(true);

    try {
      if (!user) {
        throw new Error("Please sign in to create a game.");
      }

      const response = await authFetch(user, "/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameType: "throneworld",
          scenario: "6p",
          playerIds: [user?.uid ?? "anonymous"],
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to create game");
      }

      const payload = (await response.json()) as { gameId?: string; id?: string };
      const gameId = payload.gameId ?? payload.id;

      if (!gameId) {
        throw new Error("Response did not include a gameId");
      }

      navigate(`/game/${gameId}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <LoginProfile />
      <h1>Hexachromy Lobby</h1>
      <button onClick={handleCreateGame} disabled={creating}>
        {creating ? "Creating..." : "Create New Game"}
      </button>
      {createError ? <div style={{ color: "red" }}>{createError}</div> : null}

      {loading ? (
        <div>Loading games...</div>
      ) : error ? (
        <div style={{ color: "red" }}>Error loading games: {error}</div>
      ) : (
        <ul>
          {games.map((game: GameSummary) => {
            const gameId = game.id ?? (game as { gameId?: string }).gameId;

            if (!gameId) return null;

            return (
              <li
                key={gameId}
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/game/${gameId}`)}
              >
                <strong>{game.name}</strong> — Players: {game.players.join(", ")} — Status: {game.status}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
