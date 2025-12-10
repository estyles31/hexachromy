// /frontend/src/hooks/useGameState.ts
import { useEffect, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import { authFetch } from "../auth/authFetch";
import type { GameState } from "../../../shared/models/GameState";

interface HookState<T> {
  state: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;  // NEW: Function to trigger reload
}

export interface BaseGameState {
  gameType: string;
  [key: string]: unknown;
}

export function useGameState<T extends GameState<unknown> = GameState<unknown>>(gameId: string): HookState<T> {
  const [state, setState] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);  // NEW: Trigger for refetch
  const [user] = useAuthState(auth);
  const joinAttempts = useRef<Record<string, boolean>>({});

  // NEW: Function to trigger refetch
  const refetch = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (!gameId) return;

    joinAttempts.current[gameId] = false;

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

        const data = (await response.json()) as T & {
          playerStatuses?: Record<string, string>;
        };

        const playerStatus = user ? data?.playerStatuses?.[user.uid] : undefined;

        if (user && playerStatus === "invited" && !joinAttempts.current[gameId]) {
          joinAttempts.current[gameId] = true;

          try {
            const joinResponse = await authFetch(user, `/api/games/${gameId}/join`, {
              method: "POST",
            });

            if (!joinResponse.ok) {
              const failure = await joinResponse.text();
              throw new Error(failure || "Failed to join game");
            }

            const refreshed = await authFetch(user, `/api/games/${gameId}`, {
              signal: controller.signal,
            });

            if (!refreshed.ok) {
              const failure = await refreshed.text();
              throw new Error(failure || "Failed to refresh game after joining");
            }

            const refreshedData = (await refreshed.json()) as T;
            setState(refreshedData);
            return;
          } catch (joinErr) {
            setError(joinErr instanceof Error ? joinErr : new Error("Failed to join game"));
            setLoading(false);
            return;
          }
        }

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
  }, [gameId, user, refreshTrigger]);  // NEW: Added refreshTrigger dependency

  return { state, loading, error, refetch };  // NEW: Return refetch function
}