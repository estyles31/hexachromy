// /shared-frontend/contexts/SelectionContext.tsx
import { createContext, useContext } from "react";
import type { ActionFinalize, GameAction } from "../../shared/models/GameAction";
import type { LegalActionsResponse } from "../../shared/models/ApiContexts";

export interface SelectionContextType {
  isLoading: boolean;
  showLoadingOverlay: boolean;

  legalActions: LegalActionsResponse;
  filledParams: Record<string, string>;
  selectableBoardSpaces: Set<string>;
  selectableGamePieces: Set<string>;
  finalizeInfo: Record<string, ActionFinalize>;

  // User clicks a choice (hex, piece, or button) - pass the choice.id
  select: (choiceId: string) => void;

  // Cancel current selection chain
  cancelAction: () => void;

  // Execute a complete action
  executeAction: (action: GameAction) => void;
}

export const SelectionContext = createContext<SelectionContextType | null>(null);

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
}
