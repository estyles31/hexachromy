// /shared-frontend/contexts/SelectionContext.tsx

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import type { SelectionState, SelectedItem } from "../../shared/models/SelectionState";
import type { GameAction, ActionParam, LegalChoice, ParamChoicesResponse } from "../../shared/models/ActionParams";
import { EMPTY_SELECTION } from "../../shared/models/SelectionState";

interface SelectionContextValue {
  // State
  selection: SelectionState;
  legalActions: GameAction[];
  
  // Current action being built
  activeAction: GameAction | null;
  nextParam: ActionParam | null;
  nextParamChoices: LegalChoice[];
  nextParamMessage: string | null;
  canFinalize: boolean;
  finalizeLabel: string | null;
  finalizeMetadata: Record<string, unknown> | null;
  
  // Loading state
  loading: boolean;
  
  // Actions
  select: (item: SelectedItem) => void;
  clearSelection: () => void;
  setActiveAction: (actionType: string) => void;
  cancelAction: () => void;
  executeAction: () => void;  // Execute current action with filled params
  
  // For components to know what's selectable
  selectableBoardSpaces: Set<string>;
  selectableGamePieces: Set<string>;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

interface SelectionProviderProps {
  children: React.ReactNode;
  legalActions: GameAction[];
  fetchParamChoices: (
    actionType: string,
    paramName: string,
    filledParams: Record<string, string>
  ) => Promise<ParamChoicesResponse>;
  onExecuteAction: (action: GameAction) => void;
}

export function SelectionProvider({
  children,
  legalActions,
  fetchParamChoices,
  onExecuteAction,
}: SelectionProviderProps) {
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION);
  const [loading, setLoading] = useState(false);
  const [paramChoicesCache, setParamChoicesCache] = useState<Record<string, ParamChoicesResponse>>({});

  // Find the active action definition
  const activeAction = useMemo(() => {
    if (!selection.activeActionType) return null;
    return legalActions.find(a => a.type === selection.activeActionType) ?? null;
  }, [selection.activeActionType, legalActions]);

  // Find the next unfilled parameter
  const nextParam = useMemo(() => {
    if (!activeAction) return null;
    return activeAction.params.find(p => !(p.name in selection.filledParams)) ?? null;
  }, [activeAction, selection.filledParams]);

  // Check if dependencies are met for next param
  const canFillNextParam = useMemo(() => {
    if (!nextParam) return false;
    if (!nextParam.dependsOn) return true;
    return nextParam.dependsOn in selection.filledParams;
  }, [nextParam, selection.filledParams]);

  // Get cached choices for next param
  const nextParamChoices = useMemo(() => {
    if (!activeAction || !nextParam) return [];
    const cacheKey = `${activeAction.type}:${nextParam.name}:${JSON.stringify(selection.filledParams)}`;
    return paramChoicesCache[cacheKey]?.choices ?? [];
  }, [activeAction, nextParam, selection.filledParams, paramChoicesCache]);

  const nextParamMessage = useMemo(() => {
    if (!activeAction || !nextParam) return null;
    const cacheKey = `${activeAction.type}:${nextParam.name}:${JSON.stringify(selection.filledParams)}`;
    return paramChoicesCache[cacheKey]?.message ?? nextParam.message ?? null;
  }, [activeAction, nextParam, selection.filledParams, paramChoicesCache]);

  // Check if all params are filled
  const canFinalize = useMemo(() => {
    if (!activeAction) return false;
    return activeAction.params.every(p => p.name in selection.filledParams);
  }, [activeAction, selection.filledParams]);

  // Get finalize label and metadata
  const finalizeLabel = useMemo(() => {
    if (!activeAction || !canFinalize) return null;
    // Check cache for dynamic label
    const lastParam = activeAction.params[activeAction.params.length - 1];
    const cacheKey = `${activeAction.type}:${lastParam.name}:${JSON.stringify(
      Object.fromEntries(
        Object.entries(selection.filledParams).filter(([k]) => k !== lastParam.name)
      )
    )}`;
    return paramChoicesCache[cacheKey]?.finalizeLabel ?? activeAction.finalize?.label ?? activeAction.type;
  }, [activeAction, canFinalize, selection.filledParams, paramChoicesCache]);

  const finalizeMetadata = useMemo(() => {
    if (!activeAction || !canFinalize) return null;
    const lastParam = activeAction.params[activeAction.params.length - 1];
    const cacheKey = `${activeAction.type}:${lastParam.name}:${JSON.stringify(
      Object.fromEntries(
        Object.entries(selection.filledParams).filter(([k]) => k !== lastParam.name)
      )
    )}`;
    return paramChoicesCache[cacheKey]?.finalizeMetadata ?? null;
  }, [activeAction, canFinalize, selection.filledParams, paramChoicesCache]);

  // Fetch param choices when needed
  useEffect(() => {
    if (!activeAction || !nextParam || !canFillNextParam) return;

    const cacheKey = `${activeAction.type}:${nextParam.name}:${JSON.stringify(selection.filledParams)}`;
    if (paramChoicesCache[cacheKey]) return; // Already cached

    setLoading(true);
    fetchParamChoices(activeAction.type, nextParam.name, selection.filledParams)
      .then(response => {
        setParamChoicesCache(prev => ({ ...prev, [cacheKey]: response }));
      })
      .catch(err => {
        console.error("Failed to fetch param choices:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeAction, nextParam, canFillNextParam, selection.filledParams, fetchParamChoices, paramChoicesCache]);

  // Compute what's selectable
  const { selectableBoardSpaces, selectableGamePieces } = useMemo(() => {
    const boardSpaces = new Set<string>();
    const gamePieces = new Set<string>();

    // If we have an active action with next param, use those choices
    if (activeAction && nextParam && nextParamChoices.length > 0) {
      for (const choice of nextParamChoices) {
        if (choice.type === "boardSpace" && choice.displayHint?.hexId) {
          boardSpaces.add(choice.displayHint.hexId);
        } else if (choice.type === "gamePiece" && choice.displayHint?.pieceId) {
          gamePieces.add(choice.displayHint.pieceId);
        } else {
          // Fallback to id
          if (choice.type === "boardSpace") {
            boardSpaces.add(choice.id);
          } else if (choice.type === "gamePiece") {
            gamePieces.add(choice.id);
          }
        }
      }
    }
    // If no active action, highlight things that can initiate actions
    else if (!activeAction && selection.items.length === 0 && legalActions?.length > 0) {
      for (const action of legalActions) {
        if (action.initiatedBy) {
          // We need to fetch initial choices - this is handled by first param
          // For now, assume first param choices are fetched separately
        }
        // Also check first param if no initiator
        if (action.params.length > 0 && !action.params[0].dependsOn) {
          // Need to fetch these choices too
        }
      }
    }

    return { selectableBoardSpaces: boardSpaces, selectableGamePieces: gamePieces };
  }, [activeAction, nextParam, nextParamChoices, legalActions, selection.items]);

  // Handle selection
  const select = useCallback((item: SelectedItem) => {
    setSelection(prev => {
      const newItems = [...prev.items, item];
      let newFilledParams = { ...prev.filledParams };
      let newActiveAction = prev.activeActionType;

      // If we have an active action, try to fill the next param
      if (newActiveAction) {
        const action = legalActions.find(a => a.type === newActiveAction);
        if (action) {
          const nextUnfilled = action.params.find(p => !(p.name in newFilledParams));
          if (nextUnfilled) {
            // Check if selection matches expected type
            if (nextUnfilled.type === item.type) {
              newFilledParams[nextUnfilled.name] = item.id;
            }
          }
        }
      }
      // If no active action, see if this selection initiates one
      else {
        const matchingActions = legalActions.filter(action => {
          if (!action.initiatedBy) return false;
          if (action.initiatedBy.type !== item.type) return false;
          if (action.initiatedBy.subtype && action.initiatedBy.subtype !== item.subtype) return false;
          return true;
        });

        if (matchingActions.length === 1) {
          // Only one matching action, auto-select it
          const action = matchingActions[0];
          newActiveAction = action.type;
          if (action.initiatedBy?.fillsParam) {
            newFilledParams[action.initiatedBy.fillsParam] = item.id;
          }
        } else if (matchingActions.length > 1) {
          // Multiple actions possible, don't auto-select
          // User will need to pick which action or make another selection that disambiguates
        }
      }

      return {
        items: newItems,
        activeActionType: newActiveAction,
        filledParams: newFilledParams,
      };
    });
  }, [legalActions]);

  const clearSelection = useCallback(() => {
    setSelection(EMPTY_SELECTION);
    setParamChoicesCache({});
  }, []);

  const setActiveAction = useCallback((actionType: string) => {
    setSelection(prev => ({
      ...prev,
      activeActionType: actionType,
    }));
  }, []);

  const cancelAction = useCallback(() => {
    setSelection(EMPTY_SELECTION);
    setParamChoicesCache({});
  }, []);

  // Execute the current action with filled params
  const executeAction = useCallback(() => {
    if (!activeAction || !canFinalize) return;

    onExecuteAction({
      type: activeAction.type,
      undoable: activeAction.undoable,
      params: activeAction.params,
      ...selection.filledParams,
    });
    
    clearSelection();
  }, [activeAction, canFinalize, selection.filledParams, onExecuteAction, clearSelection]);

  // Clear selection when legal actions change (new phase, etc)
  useEffect(() => {
    clearSelection();
  }, [legalActions, clearSelection]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelAction();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelAction]);

  const value: SelectionContextValue = {
    selection,
    legalActions,
    activeAction,
    nextParam,
    nextParamChoices,
    nextParamMessage,
    canFinalize,
    finalizeLabel,
    finalizeMetadata,
    loading,
    select,
    clearSelection,
    setActiveAction,
    cancelAction,
    executeAction,
    selectableBoardSpaces,
    selectableGamePieces,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}