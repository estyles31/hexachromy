import { useEffect, useState } from "react";
import { authFetch } from "../../auth/authFetch";
import { useAuth } from "src/auth/useAuth";

export interface LobbyGame {
  id: string;
  name: string;
  gameType: string;
  status: string;
  players: {
    uid: string;
    displayName?: string;
  }[];
}

export function useLobbyGames() {
  const user = useAuth();

  const [games, setGames] = useState<LobbyGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadGames() {
      setLoading(true);
      setError(null);

      try {
        const res = await authFetch(user, "/api/games");
        if (!res.ok) {
          throw new Error(`Failed to load games (${res.status})`);
        }

        const data = (await res.json()) as LobbyGame[];
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
    }

    loadGames();
    return () => { cancelled = true; };
  }, [user]);

  return { games, loading, error };
}
