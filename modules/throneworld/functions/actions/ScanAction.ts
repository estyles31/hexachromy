// /modules/throneworld/functions/actions/ScanAction.ts
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type { ActionResponse } from "../../../../shared/models/ApiContexts";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import { calculateHexDistance } from "../../shared/models/HexUtils";

export interface ScanParams {
  bunkerHexId: string;
  targetHexId: string;
}

/**
 * Get hexes containing unused Command Bunkers for the player
 */
export function getAvailableBunkers(
  state: ThroneworldGameState,
  playerId: string
): string[] {
  const bunkerHexes: string[] = [];

  for (const [hexId, system] of Object.entries(state.state.systems)) {
    const playerUnits = system.unitsOnPlanet[playerId];
    if (!playerUnits) continue;

    const hasUnusedBunker = playerUnits.some(unit => {
      const unitDef = UNITS[unit.unitTypeId];
      return unitDef?.Command && !unit.hasMoved;
    });

    if (hasUnusedBunker) {
      bunkerHexes.push(hexId);
    }
  }

  return bunkerHexes;
}

/**
 * Get hexes that can be scanned from the given bunker location
 */
export function getScannableHexes(
  state: ThroneworldGameState,
  playerId: string,
  bunkerHexId: string
): string[] {
  const player = state.players[playerId];
  if (!player) return [];

  const commRange = player.tech.Comm || 0;
  const scannableHexes: string[] = [];

  for (const [hexId, system] of Object.entries(state.state.systems)) {
    // Skip if already scanned by this player
    if (system.scannedBy?.includes(playerId)) continue;

    // Check if within Comm range
    const distance = calculateHexDistance(bunkerHexId, hexId);
    if (distance <= commRange) {
      scannableHexes.push(hexId);
    }
  }

  return scannableHexes;
}

/**
 * Execute a scan action
 */
export function executeScan(
  state: ThroneworldGameState,
  playerId: string,
  params: ScanParams
): ActionResponse {
  const { bunkerHexId, targetHexId } = params;

  const bunkerSystem = state.state.systems[bunkerHexId];
  const targetSystem = state.state.systems[targetHexId];

  if (!bunkerSystem || !targetSystem) {
    return { success: false, error: "Invalid hex" };
  }

  // Validate bunker exists and is unused
  const playerUnits = bunkerSystem.unitsOnPlanet[playerId];
  if (!playerUnits) {
    return { success: false, error: "No units at bunker location" };
  }

  const bunkerUnit = playerUnits.find(unit => {
    const unitDef = UNITS[unit.unitTypeId];
    return unitDef?.Command && !unit.hasMoved;
  });

  if (!bunkerUnit) {
    return { success: false, error: "No unused Command Bunker at location" };
  }

  // Validate target is in range
  const player = state.players[playerId];
  const commRange = player?.tech.Comm || 0;
  const distance = calculateHexDistance(bunkerHexId, targetHexId);
  
  if (distance > commRange) {
    return { success: false, error: "Target hex out of Comm range" };
  }

  // Validate target not already scanned
  if (targetSystem.scannedBy?.includes(playerId)) {
    return { success: false, error: "Hex already scanned" };
  }

  // Mark bunker as used
  bunkerUnit.hasMoved = true;

  // Add player to scannedBy list
  if (!targetSystem.scannedBy) {
    targetSystem.scannedBy = [];
  }
  targetSystem.scannedBy.push(playerId);

  return {
    success: true,
    stateChanges: state,
    message: `Scanned ${targetHexId}`,
  };
}
