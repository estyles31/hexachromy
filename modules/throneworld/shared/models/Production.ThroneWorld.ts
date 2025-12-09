import type { ThroneworldState } from "./GameState.Throneworld";

export function getProductionForPlayer(
  state: ThroneworldState,
  playerId: string,
): number {
  let total = 0;

  for (const system of Object.values(state.systems)) {
    if (system.details?.owner === playerId) {
      total += system.details?.dev ?? 0;
    }
  }

  return total;
}