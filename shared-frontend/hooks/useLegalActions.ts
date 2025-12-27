// /frontend/src/hooks/useLegalActions.ts
import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { authFetch } from "../../frontend/src/auth/authFetch";
import { useAuthState } from "react-firebase-hooks/auth";
import type { LegalActionsResponse } from "../../shared/models/ApiContexts";

export function useLegalActions(gameId: string, gameVersion: number) {
  const [user] = useAuthState(auth);
  const [legalActions, setLegalActions] = useState<LegalActionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = () => setRefreshToken((t) => t + 1);

  useEffect(() => {
    if (!user) return;

    const loadActions = async () => {
      try {
        const response = await authFetch(user, `/api/games/${gameId}/actions`);
        if (response.ok) {
          const data = await response.json();
          setLegalActions(data);
        }
      } catch (error) {
        console.error("Error loading legal actions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadActions();
  }, [gameId, user, gameVersion, refreshToken]);

  return {
    legalActions,
    loading,
    refresh
  };
}