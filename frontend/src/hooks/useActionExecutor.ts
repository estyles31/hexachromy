// /frontend/src/hooks/useActionExecutor.ts
import { useState, useCallback, useRef, useEffect } from "react";
import { authFetch } from "../auth/authFetch";
import { useAuth } from "../auth/useAuth";
import type { GameAction } from "../../../shared/models/GameAction";
import { useGameStateContext } from "../../../shared-frontend/contexts/GameStateContext";

export function useActionExecutor() {
  const user = useAuth();
  const gameState = useGameStateContext();
  const [executing, setExecuting] = useState(false);

  const versionRef = useRef(gameState.version);

  useEffect(() => {
    versionRef.current = gameState.version;
  }, [gameState]);

  const executeAction = useCallback(
    async (action: GameAction) => {
      if (!user || executing) return;

      const currentVersion = versionRef.current;
      setExecuting(true);
      try {
        const res = await authFetch(user, `/api/games/${gameState.gameId}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: {
              ...action,
              expectedVersion: currentVersion,
            },
          }),
        });

        if (!res.ok && res.status !== 409) {
          const err = await res.json();
          alert(err.error || "Failed to execute action");
        }
      } finally {
        setExecuting(false);
      }
    },
    [user, executing, gameState]
  );

  return { executeAction, executing };
}
