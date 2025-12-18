// /shared-frontend/hooks/useAvailableActions.ts

import { useMemo } from "react";
import { useSelection } from "../contexts/SelectionContext";
import type { ActionDefinition } from "../../shared/models/ActionParams";

export interface AvailableAction {
  definition: ActionDefinition;
  isActive: boolean;              // This is the currently selected action
  canFinalize: boolean;           // All params filled, ready to execute
  finalizeLabel: string | null;   // Label for confirm button
  finalizeMetadata: Record<string, unknown> | null;
}

/**
 * Hook to get actions that are available given current selection.
 * Used by ActionPanel to show confirm buttons.
 */
export function useAvailableActions(): AvailableAction[] {
  const {
    legalActions,
    activeAction,
    canFinalize,
    finalizeLabel,
    finalizeMetadata,
  } = useSelection();

  return useMemo(() => {
    return legalActions.map(action => ({
      definition: action,
      isActive: activeAction?.type === action.type,
      canFinalize: activeAction?.type === action.type && canFinalize,
      finalizeLabel: activeAction?.type === action.type ? finalizeLabel : null,
      finalizeMetadata: activeAction?.type === action.type ? finalizeMetadata : null,
    }));
  }, [legalActions, activeAction, canFinalize, finalizeLabel, finalizeMetadata]);
}
