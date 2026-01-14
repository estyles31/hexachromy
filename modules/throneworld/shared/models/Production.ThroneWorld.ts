// /modules/throneworld/shared/models/Production.ThroneWorld.ts
import type { ThroneworldGameState } from "./GameState.Throneworld";
import { Factions } from "./Factions.Throneworld";
import { getEffectiveLevel } from "./Tech.Throneworld";
import { getHexesWithinRange } from "./BoardLayout.Throneworld";

export function getProductionForPlayer(gameState: ThroneworldGameState, playerID: string): number {
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

/**
 * Check if a planet is blockaded (enemy units in orbit)
 */
export function isPlanetBlockaded(state: ThroneworldGameState, hexId: string, playerId: string): boolean {
  const system = state.state.systems[hexId];
  if (!system) return false;

  // Check if any other player has fleets in orbit
  for (const [pid, fleets] of Object.entries(system.fleetsInSpace)) {
    if (pid !== playerId && fleets && fleets.length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Find player's homeworld hex
 */
export function findPlayerHomeworld(state: ThroneworldGameState, playerId: string): string | null {
  for (const [hexId, system] of Object.entries(state.state.systems)) {
    if (system.worldType === "Homeworld" && system.details?.owner === playerId) {
      return hexId;
    }
  }
  return null;
}

/**
 * Check if planet is connected to homeworld (within Jump range and not blockaded)
 */
export function isPlanetConnected(state: ThroneworldGameState, hexId: string, playerId: string): boolean {
  const homeworldHexId = findPlayerHomeworld(state, playerId);

  if (!homeworldHexId) return false;
  if (hexId === homeworldHexId) return true; // Homeworld is always connected to itself

  // Check if blockaded
  if (isPlanetBlockaded(state, hexId, playerId)) return false;

  // Check if within Jump range
  const jumpRange = getEffectiveLevel(state.players[playerId].tech.Jump);
  const scenario =
    typeof state.options.scenario === "string" && state.options.scenario.trim().length > 0
      ? state.options.scenario
      : "6p";

  const reachableHexes = getHexesWithinRange(homeworldHexId, jumpRange, scenario);

  return reachableHexes.includes(hexId);
}

/**
 * Production info for a single planet
 */
export interface PlanetProductionInfo {
  hexId: string;
  dev: number;
  connected: boolean;
  blockaded: boolean;
  availableProduction: number; // How much can be produced locally (Infinity if connected)
}

/**
 * Get production info for all player's planets
 */
export function getPlayerProductionInfo(
  state: ThroneworldGameState,
  playerId: string
): {
  treasury: number; // Total production added to treasury from connected planets
  planets: PlanetProductionInfo[];
} {
  const planets: PlanetProductionInfo[] = [];
  let treasury = 0;

  const player = state.players[playerId];
  const faction = player.race ? Factions[player.race] : undefined;

  for (const [hexId, system] of Object.entries(state.state.systems)) {
    if (system.details?.owner !== playerId) continue;

    const baseDev = system.details.dev ?? 0;

    // Apply race production bonus
    let bonus = 0;
    if (faction?.ProductionBonus && system.worldType) {
      bonus = faction.ProductionBonus[system.worldType] ?? 0;
    }

    const dev = baseDev + bonus;
    const blockaded = isPlanetBlockaded(state, hexId, playerId);
    const connected = isPlanetConnected(state, hexId, playerId);

    const info: PlanetProductionInfo = {
      hexId,
      dev,
      connected,
      blockaded,
      availableProduction: connected ? Infinity : dev, // Isolated planets limited by dev
    };

    planets.push(info);

    // Connected planets add to treasury
    if (connected) {
      treasury += dev;
    }
  }

  return { treasury, planets };
}
