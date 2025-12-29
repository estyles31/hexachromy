// /modules/throneworld/functions/actions/ActionHelpers.ts
import { getHexesWithinRange, hexGraphDistance } from "../../shared/models/BoardLayout.ThroneWorld";
import { Fleet } from "../../shared/models/Fleets.Throneworld";
import { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { ThroneworldUnit } from "../../shared/models/Unit.Throneworld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import type { PhaseContext } from "../../../../shared-backend/Phase";
import type { LegalChoice } from "../../../../shared/models/GameAction";

// ============================================================================
// Unit and Fleet Lookups
// ============================================================================

/**
 * Find unit by ID
 */
export function findUnit(
  state: ThroneworldGameState,
  playerId: string,
  unitId: string,
  reqCommand?: boolean,
): { unit: ThroneworldUnit; hexId: string } | null {
  for (const [hexId, system] of Object.entries(state.state.systems)) {
    const playerUnits = system.unitsOnPlanet[playerId];
    if (!playerUnits) continue;

    const unit = playerUnits.find(u => u.id === unitId);
    if (!unit) continue;

    if (reqCommand) {
      const unitDef = UNITS[unit.unitTypeId];
      if (!unitDef.Command) continue;
    }

    return { unit, hexId };
  }

  return null;
}

/**
 * Find fleet by ID
 */
export function findFleet(
  state: ThroneworldGameState,
  playerId: string,
  fleetId: string
): { fleet: Fleet; hexId: string } | null {
  for (const [hexId, system] of Object.entries(state.state.systems)) {
    const playerFleets = system.fleetsInSpace[playerId];
    if (!playerFleets) continue;

    const fleet = playerFleets.find(f => f.id === fleetId);
    if (!fleet) continue;

    return { fleet, hexId };
  }

  return null;
}

// ============================================================================
// Range Calculations
// ============================================================================

export function getHexesInCommRange(
  originHexId: string,
  playerId: string,
  state: ThroneworldGameState
): string[] {
  const player = state.players[playerId];
  const commRange = player?.tech.Comm || 1;
  const scenario = typeof state.options.scenario === "string" && state.options.scenario.trim().length > 0
    ? state.options.scenario
    : "6p";
  return getHexesWithinRange(originHexId, commRange, scenario);
}

export function getHexesInJumpRange(
  originHexId: string,
  playerId: string,
  state: ThroneworldGameState
): string[] {
  const player = state.players[playerId];
  const jumpRange = player?.tech.Jump || 1;
  const scenario = typeof state.options.scenario === "string" && state.options.scenario.trim().length > 0
    ? state.options.scenario
    : "6p";
  return getHexesWithinRange(originHexId, jumpRange, scenario);
}

export function IsInCommRange(
  bunkerHexId: string,
  targetHexId: string,
  playerId: string,
  state: ThroneworldGameState
): boolean {
  const player = state.players[playerId];
  const commRange = player?.tech.Comm || 1;
  const scenario = typeof state.options.scenario === "string" && state.options.scenario.trim().length > 0
    ? state.options.scenario
    : "6p";

  return hexGraphDistance(bunkerHexId, targetHexId, scenario) <= commRange;
}

// ============================================================================
// Available Actions Queries
// ============================================================================

/**
 * Get available command bunkers as LegalChoice[]
 */
export function getAvailableBunkers(
  state: ThroneworldGameState,
  playerId: string
): LegalChoice[] {
  const result: LegalChoice[] = [];

  for (const [hexId, system] of Object.entries(state.state.systems)) {
    const units = system.unitsOnPlanet[playerId];
    if (!units) continue;

    for (const u of units) {
      const def = UNITS[u.unitTypeId];
      if (!def?.Command) continue;
      if (u.hasMoved) continue;

      result.push({
        id: u.id,
        displayHint: { pieceId: u.id, hexId }
      });
    }
  }

  return result;
}

// ============================================================================
// Scanning and Revealing
// ============================================================================

/**
 * Reveal a scanned hex to a player's playerView
 * Should be called after combat is resolved (for jumps) or immediately (for scans)
 */
export async function revealSystemToPlayer(
  ctx: PhaseContext,
  playerId: string,
  hexId: string
): Promise<void> {
  const state = ctx.gameState as ThroneworldGameState;
  const system = state.state.systems[hexId];
  
  // state playerViews should contain the neutral player view on the server side
  const details = state.playerViews?.["neutral"]?.systems[hexId];

  if(!details)
    throw new Error(`System details for hex ${hexId} not found in state.`);
    
  // Only reveal if player has scanned it
  if (!system.scannedBy?.includes(playerId)) return;
  
  await ctx.db.updateDocument(
    `games/${state.gameId}/playerViews/${playerId}`,
    {
      [`systems.${hexId}`]: details
    }
  );
}

/**
 * Check if a fleet can scan (has survey team that survived)
 */
export function canFleetScan(
  state: ThroneworldGameState,
  playerId: string,
  hexId: string
): boolean {
  const system = state.state.systems[hexId];
  if (!system) return false;
  
  const playerFleets = system.fleetsInSpace[playerId];
  if (!playerFleets || playerFleets.length === 0) return false;
  
  // Check if any fleet has a survey team (Explore unit)
  for (const fleet of playerFleets) {
    const hasSurvey = fleet.spaceUnits.some(u => UNITS[u.unitTypeId]?.Explore);
    if (hasSurvey) return true;
  }
  
  return false;
}