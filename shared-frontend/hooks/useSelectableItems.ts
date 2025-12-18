// /shared-frontend/hooks/useSelectableItems.ts

import { useMemo } from "react";
import { useSelection } from "../contexts/SelectionContext";

export interface SelectableItems {
  boardSpaces: Set<string>;
  gamePieces: Set<string>;
  loading: boolean;
}

/**
 * Hook to get currently selectable items.
 * Components use this to know what to highlight and make clickable.
 */
export function useSelectableItems(): SelectableItems {
  const { selectableBoardSpaces, selectableGamePieces, loading } = useSelection();

  return useMemo(() => ({
    boardSpaces: selectableBoardSpaces,
    gamePieces: selectableGamePieces,
    loading,
  }), [selectableBoardSpaces, selectableGamePieces, loading]);
}
