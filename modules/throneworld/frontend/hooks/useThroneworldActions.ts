// /modules/throneworld/frontend/hooks/useThroneworldActions.ts
import { useLegalActions } from "../../../../frontend/src/hooks/useLegalActions";

export function useThroneworldActions(gameId: string, gameVersion: number) {
  const { legalActions, loading } = useLegalActions(gameId, gameVersion);

  // Extract hexes to highlight from actions with hex-select category
  const highlightedHexes = legalActions?.actions
    .filter(a => a.renderHint?.category === "hex-select")
    .flatMap(a => a.renderHint?.highlightHexes || []) || [];

  // Remove duplicates
  const uniqueHighlightedHexes = Array.from(new Set(highlightedHexes));

  return {
    legalActions,
    loading,
    highlightedHexes: uniqueHighlightedHexes,
  };
}