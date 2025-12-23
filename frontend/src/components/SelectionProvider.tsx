// /frontend/src/contexts/SelectionProvider.tsx (base frontend)
// Uses SelectionContext from /shared-frontend/contexts/SelectionContext

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SelectionContext } from "../../../shared-frontend/contexts/SelectionContext";
import { EMPTY_SELECTION, type SelectionState } from "../../../shared/models/SelectionState";
import { useGameStateContext } from "../../../shared-frontend/contexts/GameStateContext";
import { useLegalActions } from "../../../shared-frontend/hooks/useLegalActions";
import type { GameAction } from "../../../shared/models/GameAction";
import type { GameObject, ParamChoicesResponse } from "../../../shared/models/ActionParams";
import { authFetch } from "../auth/authFetch";
import { useAuth } from "../auth/useAuth";
import { useActionExecutor } from "../hooks/useActionExecutor";

function actionFilledParams(action: GameAction): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of action.params ?? []) {
    if (p.value !== undefined && p.value !== null) out[p.name] = String(p.value);
  }
  return out;
}

function nextUnfilledParam(action: GameAction) {
  return (action.params ?? []).find(p => p.value === undefined || p.value === null);
}

function isActionResolved(action: GameAction): boolean {
  for (const p of action.params ?? []) {
    if (p.optional) continue;
    if (p.value === undefined || p.value === null) return false;
  }
  return true;
}

function cacheKey(actionType: string, paramName: string, filled: Record<string, string>) {
  // stable-ish key (order matters in JSON.stringify, so sort keys)
  const sorted = Object.fromEntries(Object.entries(filled).sort(([a],[b]) => a.localeCompare(b)));
  return `${actionType}:${paramName}:${JSON.stringify(sorted)}`;
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const user = useAuth();
  const { gameId, version } = useGameStateContext();

  const { legalActions } = useLegalActions(gameId, version);

  // Candidate actions are the *actual* action instances we're filling.
  const [candidateActions, setCandidateActions] = useState<GameAction[]>([]);
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION);

  const [paramCache, setParamCache] = useState<Record<string, ParamChoicesResponse>>({});

  const selectableBoardSpaces = useMemo(() => new Set<string>(), []);
  const selectableGamePieces = useMemo(() => new Set<string>(), []);

  const { executeAction: sendAction } = useActionExecutor();

  // Reset candidates when legal actions change
  useEffect(() => {
    setSelection(EMPTY_SELECTION);
    setParamCache({});
    setCandidateActions(legalActions?.actions ?? []);
  }, [legalActions]);

  const cancelAction = useCallback(() => {
    setSelection(EMPTY_SELECTION);
    setParamCache({});
    setCandidateActions(legalActions?.actions ?? []);
  }, [legalActions]);

  const fetchParamChoices = useCallback(async (
    actionType: string,
    paramName: string,
    filledParams: Record<string, string>
  ): Promise<ParamChoicesResponse> => {
    if (!user) return { choices: [], error: "Not authenticated" };

    try {
      const res = await authFetch(user, `/api/games/${gameId}/param-choices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, paramName, filledParams }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { choices: [], error: err.error || "Failed to fetch choices" };
      }

      return await res.json();
    } catch (e) {
      console.error("fetchParamChoices failed:", e);
      return { choices: [], error: "Network error" };
    }
  }, [user, gameId]);

  // Build union highlights across all candidates
  const buildHighlightState = useCallback(async () => {
    selectableBoardSpaces.clear();
    selectableGamePieces.clear();

    const localAddsBoard: string[] = [];
    const localAddsPieces: string[] = [];

    for (const action of candidateActions) {
      const next = nextUnfilledParam(action);
      if (!next) continue;

      const filled = actionFilledParams(action);
      const key = cacheKey(action.type, next.name, filled);

      let resp = paramCache[key];
      if (!resp) {
        resp = await fetchParamChoices(action.type, next.name, filled);
        setParamCache(prev => ({ ...prev, [key]: resp! }));
      }

      for (const choice of resp.choices ?? []) {
        if (choice.type === "boardSpace" && choice.displayHint?.hexId) {
          localAddsBoard.push(choice.displayHint.hexId);
        } else if (choice.type === "gamePiece" && choice.displayHint?.pieceId) {
          localAddsPieces.push(choice.displayHint.pieceId);
        }
      }
    }

    for (const h of localAddsBoard) selectableBoardSpaces.add(h);
    for (const p of localAddsPieces) selectableGamePieces.add(p);
  }, [
    candidateActions,
    fetchParamChoices,
    paramCache,
    selectableBoardSpaces,
    selectableGamePieces,
  ]);

  useEffect(() => {
    buildHighlightState();
  }, [buildHighlightState]);

  // Selection step: mutate param.value on each surviving action instance
  const select = useCallback((item: GameObject) => {
    const survivors: GameAction[] = [];

    for (const action of candidateActions) {
      const next = nextUnfilledParam(action);
      if (!next) continue;

      if (next.type !== item.type) continue;
      if (next.subtype && item.subtype && next.subtype !== item.subtype) continue;

      // fill on the action instance
      next.value = item.id;
      survivors.push(action);
    }

    setCandidateActions(survivors);
    setSelection(prev => ({
      ...prev,
      items: [...prev.items, item],
    }));
  }, [candidateActions]);

  const resolvedActions = useMemo(() => {
    return candidateActions.filter(isActionResolved);
  }, [candidateActions]);

  // Execute is explicit only: receives a fully-parameterized action envelope
  const executeAction = useCallback((action: GameAction) => {
    // No hydration.  Params already live on the action.
    sendAction(action);

    setSelection(EMPTY_SELECTION);
    setParamCache({});
    setCandidateActions(legalActions?.actions ?? []);
  }, [sendAction, legalActions]);

  return (
    <SelectionContext.Provider
      value={{
        selection,
        legalActions: legalActions?.actions ?? [],
        resolvedActions,
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
