// /modules/throneworld/functions/helpers/CombatHelpers.ts
import type { PhaseContext } from "../../../../shared-backend/Phase";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";

/**
 * Check if there is combat at a hex and resolve it if needed
 * Returns true if combat occurred
 */
export async function resolveHexCombat(
  ctx: PhaseContext,
  playerId: string,
  hexId: string
): Promise<boolean> {
  const state = ctx.gameState as ThroneworldGameState;
  const system = state.state.systems[hexId];
  
  if (!system) return false;
  
  // Check for enemy fleets
  const enemyFleets = Object.entries(system.fleetsInSpace)
    .filter(([owner]) => owner !== playerId && owner !== "neutral")
    .flatMap(([, fleets]) => fleets);
  
  if (enemyFleets.length === 0) return false;
  
  // TODO: Implement combat resolution
  console.log(`Combat at ${hexId} between ${playerId} and enemies`);
  
  return true;
}