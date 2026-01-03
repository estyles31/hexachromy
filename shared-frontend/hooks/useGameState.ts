// /frontend/src/hooks/useGameState.ts
import { useEffect, useState } from "react";
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

export function useGameState<T extends GameState<unknown>>(gameId: string): HookState<T> {
  const [state, setState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [user] = useAuthState(auth);

  const debug = process.env.DEBUG === "true";

  // Initial API load
  useEffect(() => {
    if (!gameId || !user) return;

    setLoading(true);

    authFetch(user, `/api/games/${gameId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((fullState) => {
        setState(fullState);
        setLoading(false);
        if (debug) console.log("[useGameState] API loaded");
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [gameId, user?.uid]);

  // Firestore live updates
  useEffect(() => {
    if (!gameId || !user) return;

    let baseState: any = null;
    let playerView: any = null;

    const update = () => {
      if (!baseState) return;

      setState({
        ...baseState,
        playerViews: {
          ...(baseState.playerViews ?? {}),
          ...(playerView ? { [user.uid]: playerView } : {}),
        },
      });
    };

    const unsubGame = onSnapshot(doc(firestore, `games/${gameId}`), (snap) => {
      if (!snap.exists()) return;
      baseState = snap.data();
      update();
    });

    const unsubView = onSnapshot(doc(firestore, `games/${gameId}/playerViews/${user.uid}`), (snap) => {
      playerView = snap.exists() ? snap.data() : null;
      if (debug) console.log("[useGameState] playerView updated");
      update();
    });

    return () => {
      unsubGame();
      unsubView();
    };
  }, [gameId, user?.uid]);

  return { state, loading, error };
}
