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
export function useGameState<T extends GameState<unknown>>(gameId: string): HookState<T> {
  const [state, setState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [user] = useAuthState(auth);

  const baseRef = useRef<any>(null);
  const viewRef = useRef<any>(null);
  const apiLoadedRef = useRef(false);

  // 1. API load (canonical full state)
  useEffect(() => {
    if (!gameId || !user) return;

    setLoading(true);
    apiLoadedRef.current = false;

    (async () => {
      try {
        const response = await authFetch(user, `/api/games/${gameId}`);
        if (!response.ok) throw new Error(await response.text());

        const fullState = await response.json();
        setState(fullState);

        // Set these so future patches know the current values
        baseRef.current = fullState;
        viewRef.current = {};

        apiLoadedRef.current = true;
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    })();
  }, [gameId, user?.uid]);

  // 2. Firestore listeners (patches only)
  useEffect(() => {
    if (!gameId || !user) return;

    const gameDocRef = doc(firestore, `games/${gameId}`);
    const viewDocRef = doc(firestore, `games/${gameId}/playerViews/${user.uid}`);

    const applyPatch = () => {
      if (!apiLoadedRef.current) return;

      setState({
        ...baseRef.current,
        ...(viewRef.current ?? {}),
      });
    };

    const unsubGame = onSnapshot(gameDocRef, (snap) => {
      if (snap.exists()) {
        baseRef.current = {
          ...baseRef.current,
          ...snap.data(), // patch only base fields
        };
        applyPatch();
      }
    },
      (err) => {
        // Permission denied? Normal. Just ignore player view.
        console.warn("PlayerView snapshot error:", err);

        // Ensure view remains an empty object, NOT undefined.
        viewRef.current = {};

        applyPatch(); // still merge base state
      });

    const unsubView = onSnapshot(viewDocRef, (snap) => {
      if (snap.exists()) {
        viewRef.current = {
          ...viewRef.current,
          ...snap.data(), // patch only view fields
        };
        applyPatch();
      }
    });

    return () => {
      unsubGame();
      unsubView();
    };
  }, [gameId, user?.uid]);

  return { state, loading, error };
}
