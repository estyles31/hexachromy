import type { ThroneworldGameState } from "./GameState.Throneworld";
import { Factions } from "./Factions.ThroneWorld";

export function getProductionForPlayer(
  gameState: ThroneworldGameState,
  playerID: string
): number {
  let total = 0;

  const player = gameState.players[playerID];

  for (const system of Object.values(gameState.state.systems)) {
    if (system.details?.owner === player.uid) {
      const baseProd = system.details?.dev ?? 0;
      
      // Apply race production bonus if available
      let bonus = 0;
      const faction = player.race ? Factions[player.race] : undefined;

      if (faction?.ProductionBonus && system.worldType) {
        bonus = faction.ProductionBonus[system.worldType] ?? 0;
      }
      
      total += baseProd + bonus;
    }
  }

  return total;
}