import { useEffect, useState } from "react";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld.ts";

interface HookState {
  state: ThroneworldGameState | null;
  loading: boolean;
  error: Error | null;
}

export function useThroneworldGameState(gameId: string): HookState {
  const [state, setState] = useState<ThroneworldGameState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/throneworld/state/${gameId}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `Failed to load game ${gameId}`);
        }
        return response.json() as Promise<ThroneworldGameState>;
      })
      .then(data => {
        setState(data);
      })
      .catch(err => {
        if (err.name === "AbortError") return;
        setError(err instanceof Error ? err : new Error("Unknown error"));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [gameId]);

  return { state, loading, error };
}
