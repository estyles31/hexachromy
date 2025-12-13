// /frontend/src/hooks/useActionExecutor.ts
import { useState, useCallback } from "react";
import { authFetch } from "../auth/authFetch";
import { useAuth } from "../auth/useAuth";
import type { GameAction } from "../../../shared/models/ApiContexts";

export function useActionExecutor(gameId: string, gameVersion: number, onActionTaken: () => void) {
  const user = useAuth();
  const [executing, setExecuting] = useState(false);

  const executeAction = useCallback(async (action: GameAction) => {
    if (!user || executing) return;

    setExecuting(true);
    try {
      const response = await authFetch(user, `/api/games/${gameId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: {
            ...action,
            expectedVersion: gameVersion,
          },
        }),
      });

      if (response.ok) {
        onActionTaken();
      } else if (response.status === 409) {
        alert("Game state changed. Please refresh.");
        onActionTaken();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to execute action");
      }
    } catch (error) {
      console.error("Error executing action:", error);
      alert("Failed to execute action");
    } finally {
      setExecuting(false);
    }
  }, [user, executing, gameId, gameVersion, onActionTaken]);

  return { executeAction, executing };
}