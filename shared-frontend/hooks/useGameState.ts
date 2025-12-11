// /frontend/src/hooks/useGameState.ts
import { useEffect, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { authFetch } from "../../frontend/src/auth/authFetch";
import type { GameState } from "../../shared/models/GameState";

interface HookState<T> {
  state: T | null;
  loading: boolean;
  error: Error | null;
}

export interface BaseGameState {
  gameType: string;
  [key: string]: unknown;
}

export function useGameState<T extends GameState<unknown> = GameState<unknown>>(gameId: string): HookState<T> {
  const [state, setState] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [user] = useAuthState(auth);
  const joinAttempts = useRef<Record<string, boolean>>({});
  const hasInitialLoad = useRef(false);

  useEffect(() => {
    if (!gameId || !user) return;

    joinAttempts.current[gameId] = false;

    // Initial load via API (handles join logic and player-specific views)
    const initialLoad = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await authFetch(user, `/api/games/${gameId}`);

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `Failed to load game ${gameId}`);
        }

        const data = (await response.json()) as T & {
          playerStatuses?: Record<string, string>;
        };

        const playerStatus = user ? data?.playerStatuses?.[user.uid] : undefined;

        // Auto-join if invited
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

            const refreshed = await authFetch(user, `/api/games/${gameId}`);

            if (!refreshed.ok) {
              const failure = await refreshed.text();
              throw new Error(failure || "Failed to refresh game after joining");
            }

            const refreshedData = (await refreshed.json()) as T;
            setState(refreshedData);
            hasInitialLoad.current = true;
            return;
          } catch (joinErr) {
            setError(joinErr instanceof Error ? joinErr : new Error("Failed to join game"));
            setLoading(false);
            return;
          }
        }

        setState(data);
        hasInitialLoad.current = true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    void initialLoad();
  }, [gameId, user]);

  // Set up Firestore listener after initial load
  useEffect(() => {
    if (!gameId || !hasInitialLoad.current) return;

    const docRef = doc(firestore, `games/${gameId}`);
    
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const newState = snapshot.data() as T;
          setState(newState);
        }
      },
      (err) => {
        console.error("Firestore listener error:", err);
        setError(err);
      }
    );

    return () => unsubscribe();
  }, [gameId, hasInitialLoad.current]);

  return { state, loading, error };
}