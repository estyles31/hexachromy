// /frontend/src/hooks/useParameterValues.ts
import { useState, useEffect } from "react";
import { useAuth } from "../auth/useAuth";
import { authFetch } from "../auth/authFetch";
import type { ParameterValuesResponse } from "../../../shared/models/ApiContexts";

export function useParameterValues(
  gameId: string,
  actionType: string,
  parameterName: string,
  partialParameters: Record<string, unknown>
) {
  const user = useAuth();
  const [values, setValues] = useState<ParameterValuesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!actionType || !parameterName) return;

    const fetchValues = async () => {
      setLoading(true);
      try {
        // Build query string from partial parameters
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(partialParameters)) {
          queryParams.append(key, String(value));
        }

        const url = `/api/games/${gameId}/actions/${actionType}/parameters/${parameterName}?${queryParams}`;
        const response = await authFetch(user, url);

        if (response.ok) {
          const data = await response.json();
          setValues(data);
        } else {
          console.error("Failed to fetch parameter values");
          setValues(null);
        }
      } catch (error) {
        console.error("Error fetching parameter values:", error);
        setValues(null);
      } finally {
        setLoading(false);
      }
    };

    fetchValues();
  }, [gameId, actionType, parameterName, JSON.stringify(partialParameters), user]);

  return { values, loading };
}