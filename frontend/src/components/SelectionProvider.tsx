// /frontend/src/components/SelectionProvider.tsx

import React, { useCallback, useEffect, useState } from "react";
import { SelectionContext } from "../../../shared-frontend/contexts/SelectionContext";
import { useGameStateContext } from "../../../shared-frontend/contexts/GameStateContext";
import type { GameAction } from "../../../shared/models/GameAction";
import type { LegalActionsResponse } from "../../../shared/models/ApiContexts";
import { authFetch } from "../auth/authFetch";
import { useAuth } from "../auth/useAuth";
import { useActionExecutor } from "../hooks/useActionExecutor";

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const user = useAuth();
  const { gameId, version } = useGameStateContext();

  const [legalActions, setLegalActions] = useState<LegalActionsResponse>({ actions: [] });
  const [filledParams, setFilledParams] = useState<Record<string, string>>({});
  const [selectableBoardSpaces, setSelectableBoardSpaces] = useState<Set<string>>(new Set());
  const [selectableGamePieces, setSelectableGamePieces] = useState<Set<string>>(new Set());

  const { executeAction: sendAction } = useActionExecutor();

  // Build highlight sets from actions with populated choices
  const buildHighlights = useCallback((actions: GameAction[]) => {
    const boardSpaces = new Set<string>();
    const gamePieces = new Set<string>();

    for (const action of actions) {
      const nextParam = action.params.find((p) => !p.optional && (p.value === undefined || p.value === null));
      if (!nextParam?.choices) continue;

      for (const choice of nextParam.choices) {
        if (nextParam.type === "boardSpace" && choice.displayHint?.hexId) {
          boardSpaces.add(choice.displayHint.hexId);
        } else if (nextParam.type === "gamePiece" && choice.displayHint?.pieceId) {
          gamePieces.add(choice.displayHint.pieceId);
        }
      }
    }

    setSelectableBoardSpaces(boardSpaces);
    setSelectableGamePieces(gamePieces);
  }, []);

  // Fetch legal actions from backend
  const fetchLegalActions = useCallback(
    async (params?: Record<string, string>) => {
      if (!user) return;

      try {
        const res = await authFetch(user, `/api/games/${gameId}/legal-actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filledParams: params || {} }),
        });

        if (!res.ok) {
          console.error("fetchLegalActions failed");
          return;
        }

        const response: LegalActionsResponse = await res.json();
        setLegalActions(response);
        buildHighlights(response.actions);
      } catch (e) {
        console.error("fetchLegalActions failed:", e);
      }
    },
    [user, gameId, buildHighlights]
  );

  // Reload on version change - preserve filledParams if still valid
  useEffect(() => {
    const hasFilledParams = Object.keys(filledParams).length > 0;

    if (hasFilledParams) {
      // User has work in progress - reload with their filledParams
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchLegalActions(filledParams).then(() => {
        // If no actions came back, the params are invalid - clear and reload
        if (legalActions.actions.length === 0) {
          setFilledParams({});
          fetchLegalActions();
        }
      });
    } else {
      // No work in progress, just reload fresh
      setFilledParams({});
      fetchLegalActions();
    }
  }, [version, fetchLegalActions]);

  // User selects something (hex, piece, or choice button)
  const select = useCallback(
    async (choiceId: string) => {
      // Find which param this choice belongs to
      const activeParam = legalActions.actions.flatMap((a) => a.params).find((p) => p.choices?.some((c) => c.id === choiceId));

      if (!activeParam) {
        console.error("No active param found for choice:", choiceId);
        return;
      }

      const newFilledParams = {
        ...filledParams,
        [activeParam.name]: choiceId,
      };

      setFilledParams(newFilledParams);
      await fetchLegalActions(newFilledParams);
    },
    [legalActions.actions, filledParams, fetchLegalActions]
  );

  // Cancel current selection chain
  const cancelAction = useCallback(() => {
    setFilledParams({});
    fetchLegalActions();
  }, [fetchLegalActions]);

  // Execute a complete action
  const executeAction = useCallback(
    (action: GameAction) => {
      sendAction(action);
      setFilledParams({});
      fetchLegalActions();
    },
    [sendAction, fetchLegalActions]
  );

  return (
    <SelectionContext.Provider
      value={{
        legalActions,
        filledParams,
        selectableBoardSpaces,
        selectableGamePieces,
        select,
        cancelAction,
        executeAction,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}
