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

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const user = useAuth();
  const { gameId, version } = useGameStateContext();

  const { legalActions, refresh } = useLegalActions(gameId, version);

  // Candidate actions are the *actual* action instances we're filling.
  const [candidateActions, setCandidateActions] = useState<GameAction[]>([]);
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION);

  const [selectableBoardSpaces, setSelectableBoardSpaces] = useState<Set<string>>(new Set());
  const [selectableGamePieces, setSelectableGamePieces] = useState<Set<string>>(new Set());

  const { executeAction: sendAction } = useActionExecutor();

  // Reset candidates when legal actions change
  useEffect(() => {
    setSelection(EMPTY_SELECTION);
    setCandidateActions(legalActions?.actions ?? []);
  }, [legalActions]);

  const cancelAction = useCallback(() => {
    setSelection(EMPTY_SELECTION);
    refresh();
  }, [legalActions]);

  // Updated fetchParamChoices - sends candidate actions instead of single action
  const fetchParamChoices = useCallback(async (
    candidateActions: GameAction[]
  ): Promise<{ actions: Array<{ actionType: string; nextParam: string } & ParamChoicesResponse> }> => {
    if (!user) return { actions: [] };

    try {
      const res = await authFetch(user, `/api/games/${gameId}/param-choices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateActions: candidateActions.map(a => ({
            type: a.type,
            params: a.params
          }))
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("fetchParamChoices failed:", err);
        return { actions: [] };
      }

      return await res.json();
    } catch (e) {
      console.error("fetchParamChoices failed:", e);
      return { actions: [] };
    }
  }, [user, gameId]);

  const buildHighlightState = useCallback(async () => {
    const newBoardSpaces = new Set<string>();
    const newGamePieces = new Set<string>();

    if (candidateActions.length > 0) {
      // Make one call with all candidate actions
      const response = await fetchParamChoices(candidateActions);

      // Process all returned choices
      for (const actionResult of response.actions) {
        for (const choice of actionResult.choices ?? []) {
          if (choice.type === "boardSpace" && choice.displayHint?.hexId) {
            newBoardSpaces.add(choice.displayHint.hexId);
          } else if (choice.type === "gamePiece" && choice.displayHint?.pieceId) {
            newGamePieces.add(choice.displayHint.pieceId);
          }
        }
      }
    }

    setSelectableBoardSpaces(newBoardSpaces);
    setSelectableGamePieces(newGamePieces);
  }, [candidateActions, fetchParamChoices]);

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
    sendAction(action);
    setSelection(EMPTY_SELECTION);
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
