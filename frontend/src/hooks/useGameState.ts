import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import { authFetch } from "../utils/authFetch";

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
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (!gameId) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const loadGame = async () => {
      try {
        if (!user) {
          throw new Error("Authentication required");
        }

        const response = await authFetch(user, `/api/games/${gameId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `Failed to load game ${gameId}`);
        }

        const data = (await response.json()) as T;
        setState(data);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    void loadGame();

    return () => controller.abort();
  }, [gameId, user]);

  return { state, loading, error };
}
