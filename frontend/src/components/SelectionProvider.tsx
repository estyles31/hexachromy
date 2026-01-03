import React, { useCallback, useEffect, useRef, useState } from "react";
import { SelectionContext } from "../../../shared-frontend/contexts/SelectionContext";
import { useGameStateContext } from "../../../shared-frontend/contexts/GameStateContext";
import type { ActionFinalize, GameAction } from "../../../shared/models/GameAction";
import type { LegalActionsResponse } from "../../../shared/models/ApiContexts";
import { authFetch } from "../auth/authFetch";
import { useAuth } from "../auth/useAuth";
import { useActionExecutor } from "../hooks/useActionExecutor";

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const user = useAuth();
  const { gameId, version } = useGameStateContext();
  const actionExecutor = useActionExecutor();

  const [legalActions, setLegalActions] = useState<LegalActionsResponse>({ actions: [] });
  const [finalizeInfo, setFinalizeInfo] = useState<Record<string, ActionFinalize>>({});
  const [filledParams, setFilledParams] = useState<Record<string, string>>({});
  const [selectableBoardSpaces, setSelectableBoardSpaces] = useState<Set<string>>(new Set());
  const [selectableGamePieces, setSelectableGamePieces] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

  const updateDepth = useRef(0);
  const fetchIdRef = useRef(0);

  /* ---------------- transaction helpers ---------------- */

  const beginUpdate = (fromUser: boolean) => {
    updateDepth.current++;
    if (updateDepth.current === 1) {
      setIsLoading(true);
      if (fromUser) setShowLoadingOverlay(true);
    }
  };

  const endUpdate = () => {
    updateDepth.current--;
    if (updateDepth.current === 0) {
      setIsLoading(false);
      setShowLoadingOverlay(false);
    }
  };

  /* ---------------- highlight helpers ---------------- */

  const buildHighlights = useCallback((actions: GameAction[]) => {
    const boardSpaces = new Set<string>();
    const gamePieces = new Set<string>();

    for (const action of actions) {
      const nextParam = action.params.find((p) => !p.optional && p.value == null);
      if (!nextParam?.choices) continue;

      for (const choice of nextParam.choices) {
        if (nextParam.type === "boardSpace" && choice.displayHint?.hexId) {
          boardSpaces.add(choice.displayHint.hexId);
        }
        if (nextParam.type === "gamePiece" && choice.displayHint?.pieceId) {
          gamePieces.add(choice.displayHint.pieceId);
        }
      }
    }

    setSelectableBoardSpaces(boardSpaces);
    setSelectableGamePieces(gamePieces);
  }, []);

  /* ---------------- backend fetch ---------------- */

  const fetchLegalActions = useCallback(
    async (params?: Record<string, string>): Promise<LegalActionsResponse> => {
      if (!user) return { actions: [] };

      const fetchId = ++fetchIdRef.current;

      const res = await authFetch(user, `/api/games/${gameId}/legal-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filledParams: params || {} }),
      });

      if (!res.ok) return { actions: [] };

      const response: LegalActionsResponse = await res.json();
      if (fetchId !== fetchIdRef.current) return response;

      setLegalActions(response);
      buildHighlights(response.actions);
      return response;
    },
    [user, gameId, buildHighlights]
  );

  const fetchFinalizeInfo = useCallback(
    async (actions: GameAction[]) => {
      if (!user || actions.length === 0) {
        setFinalizeInfo({});
        return;
      }

      const info: Record<string, ActionFinalize> = {};
      for (const action of actions) {
        const res = await authFetch(user, `/api/games/${gameId}/finalize-info`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (res.ok) {
          info[action.type] = await res.json();
        }
      }
      setFinalizeInfo(info);
    },
    [user, gameId]
  );

  /* ---------------- external updates ---------------- */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      beginUpdate(false);
      try {
        const params = Object.keys(filledParams).length ? filledParams : undefined;
        const response = await fetchLegalActions(params);
        if (!cancelled && params && response.actions.length === 0) {
          setFilledParams({});
          await fetchLegalActions();
        }
      } finally {
        if (!cancelled) endUpdate();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [version, fetchLegalActions]);

  /* ---------------- user interaction (ONE TRANSACTION) ---------------- */

  const select = useCallback(
    async (choiceId: string) => {
      beginUpdate(true);

      try {
        const activeParam = legalActions.actions
          .flatMap((a) => a.params)
          .find((p) => p.choices?.some((c) => c.id === choiceId));

        if (!activeParam) return;

        const newFilledParams = { ...filledParams, [activeParam.name]: choiceId };
        setFilledParams(newFilledParams);

        const response = await fetchLegalActions(newFilledParams);
        await fetchFinalizeInfo(response.actions.filter((a) => a.params.every((p) => p.optional || p.value != null)));
      } finally {
        endUpdate();
      }
    },
    [legalActions.actions, filledParams, fetchLegalActions, fetchFinalizeInfo]
  );

  const cancelAction = useCallback(() => {
    beginUpdate(true);
    setFilledParams({});
    fetchLegalActions().finally(endUpdate);
  }, [fetchLegalActions]);

  const executeAction = useCallback(
    (action: GameAction) => {
      beginUpdate(true);
      actionExecutor.executeAction(action);
      setFilledParams({});
      fetchLegalActions().finally(endUpdate);
    },
    [actionExecutor, fetchLegalActions]
  );

  return (
    <SelectionContext.Provider
      value={{
        legalActions,
        finalizeInfo,
        filledParams,
        selectableBoardSpaces,
        selectableGamePieces,
        isLoading,
        showLoadingOverlay,
        select,
        cancelAction,
        executeAction,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}
