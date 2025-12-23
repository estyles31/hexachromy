import { createContext, useContext } from "react";
import type { SelectionState } from "../../shared/models/SelectionState";
import type { GameAction } from "../../shared/models/GameAction";
import type { GameObject } from "../../shared/models/ActionParams";

export interface SelectionContextValue {
  selection: SelectionState;
  legalActions: GameAction[];
  resolvedActions: GameAction[];
  selectableBoardSpaces: Set<string>;
  selectableGamePieces: Set<string>;
  select(item: GameObject): void;
  cancelAction(): void;
  executeAction(action: GameAction): void;
}

export const SelectionContext = createContext<SelectionContextValue | null>(null);

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("SelectionContext missing");
  return ctx;
}
