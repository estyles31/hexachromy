import { useEffect, useState } from "react";

interface HookState<T> {
  state: T | null;
  loading: boolean;
  error: Error | null;
}

export interface BaseGameState {
  gameType: string;
  [key: string]: unknown;
}

export function useGameState<T extends BaseGameState = BaseGameState>(gameId: string): HookState<T> {
  const [state, setState] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/games/${gameId}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `Failed to load game ${gameId}`);
        }
        return response.json() as Promise<T>;
      })
      .then(data => setState(data))
      .catch(err => {
        if (err.name === "AbortError") return;
        setError(err instanceof Error ? err : new Error("Unknown error"));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [gameId]);

  return { state, loading, error };
}
