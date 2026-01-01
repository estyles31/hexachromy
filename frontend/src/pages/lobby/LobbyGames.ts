// /frontend/srt/pages/lobby/LobbyGames.ts
import { useEffect, useState } from "react";
import { authFetch } from "../../auth/authFetch";
import { useAuth } from "../../auth/useAuth";
import type { EnrichedGameSummary } from "../../../../shared/models/GameSummary";

export function useLobbyGames() {
  const user = useAuth();

  const [games, setGames] = useState<EnrichedGameSummary[]>([]);
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

        const data = (await res.json()) as EnrichedGameSummary[];
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
