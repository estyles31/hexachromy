// /modules/throneworld/functions/actions/JumpAction.ts
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type { ActionResponse } from "../../../../shared/models/ApiContexts";
import type { Fleet } from "../../shared/models/Fleets.Throneworld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import { calculateHexDistance } from "../../shared/models/HexUtils";

export interface JumpParams {
  bunkerHexId: string;
  fleetId: string;
  targetHexId: string;
}

export interface JumpableFleet {
  fleetId: string;
  hexId: string;
}

/**
 * Get fleets that can be jumped by the bunker at the given location
 */
export function getJumpableFleets(
  state: ThroneworldGameState,
  playerId: string,
  bunkerHexId: string
): JumpableFleet[] {
  const player = state.players[playerId];
  if (!player) return [];

  const commRange = player.tech.Comm || 0;
  const jumpableFleets: JumpableFleet[] = [];

  for (const [hexId, system] of Object.entries(state.state.systems)) {
    // Check if hex is within Comm range of bunker
    const distance = calculateHexDistance(bunkerHexId, hexId);
    if (distance > commRange) continue;

    const playerFleets = system.fleetsInSpace[playerId];
    if (!playerFleets) continue;

    for (const fleet of playerFleets) {
      // Check if fleet has Static units (can't jump)
      const hasStatic = [...fleet.spaceUnits, ...fleet.groundUnits].some(unit =>
        UNITS[unit.unitTypeId]?.Static
      );
      if (hasStatic) continue;

      // Check if fleet has already moved this turn
      const hasMoved = [...fleet.spaceUnits, ...fleet.groundUnits].some(unit => unit.hasMoved);
      if (hasMoved) continue;

      jumpableFleets.push({ fleetId: fleet.fleetId, hexId });
    }
  }

  return jumpableFleets;
}

/**
 * Find a fleet by ID and return it with its current hex location
 */
function findFleet(
  state: ThroneworldGameState,
  playerId: string,
  fleetId: string
): { fleet: Fleet; hexId: string } | null {
  for (const [hexId, system] of Object.entries(state.state.systems)) {
    const playerFleets = system.fleetsInSpace[playerId];
    if (!playerFleets) continue;

    const fleet = playerFleets.find(f => f.fleetId === fleetId);
    if (fleet) {
      return { fleet, hexId };
    }
  }
  return null;
}

/**
 * Get valid jump destinations for a fleet
 */
export function getJumpDestinations(
  state: ThroneworldGameState,
  playerId: string,
  fleetId: string
): string[] {
  const player = state.players[playerId];
  if (!player) return [];

  const fleetInfo = findFleet(state, playerId, fleetId);
  if (!fleetInfo) return [];

  const { fleet, hexId: fleetHexId } = fleetInfo;
  const jumpRange = player.tech.Jump || 0;

  // Check if fleet has Explore capability (Survey Teams)
  const canExplore = fleet.spaceUnits.some(unit => UNITS[unit.unitTypeId]?.Explore);

  const destinationHexes: string[] = [];

  for (const [hexId, system] of Object.entries(state.state.systems)) {
    // Check if within Jump range
    const distance = calculateHexDistance(fleetHexId, hexId);
    if (distance > jumpRange) continue;

    // If hex not scanned and fleet can't explore, skip it
    if (!system.scannedBy?.includes(playerId) && !canExplore) continue;

    destinationHexes.push(hexId);
  }

  return destinationHexes;
}

/**
 * Execute a jump action
 */
export function executeJump(
  state: ThroneworldGameState,
  playerId: string,
  params: JumpParams
): ActionResponse {
  const { bunkerHexId, fleetId, targetHexId } = params;

  const bunkerSystem = state.state.systems[bunkerHexId];
  const targetSystem = state.state.systems[targetHexId];

  if (!bunkerSystem || !targetSystem) {
    return { success: false, error: "Invalid hex" };
  }

  // Validate bunker exists and is unused
  const bunkerUnits = bunkerSystem.unitsOnPlanet[playerId];
  if (!bunkerUnits) {
    return { success: false, error: "No units at bunker location" };
  }

  const bunkerUnit = bunkerUnits.find(unit => {
    const unitDef = UNITS[unit.unitTypeId];
    return unitDef?.Command && !unit.hasMoved;
  });

  if (!bunkerUnit) {
    return { success: false, error: "No unused Command Bunker at location" };
  }

  // Find and validate fleet
  const fleetInfo = findFleet(state, playerId, fleetId);
  if (!fleetInfo) {
    return { success: false, error: "Fleet not found" };
  }

  const { fleet, hexId: sourceHexId } = fleetInfo;
  const sourceSystem = state.state.systems[sourceHexId];

  // Validate fleet is in Comm range of bunker
  const player = state.players[playerId];
  const commRange = player?.tech.Comm || 0;
  const bunkerToFleetDistance = calculateHexDistance(bunkerHexId, sourceHexId);
  
  if (bunkerToFleetDistance > commRange) {
    return { success: false, error: "Fleet out of Comm range of bunker" };
  }

  // Validate target is in Jump range of fleet
  const jumpRange = player?.tech.Jump || 0;
  const fleetToTargetDistance = calculateHexDistance(sourceHexId, targetHexId);
  
  if (fleetToTargetDistance > jumpRange) {
    return { success: false, error: "Target hex out of Jump range" };
  }

  // Validate exploration rules
  const canExplore = fleet.spaceUnits.some(unit => UNITS[unit.unitTypeId]?.Explore);
  if (!targetSystem.scannedBy?.includes(playerId) && !canExplore) {
    return { success: false, error: "Cannot jump to unscanned hex without Survey Team" };
  }

  // Validate fleet can move (no Static units, hasn't moved)
  const hasStatic = [...fleet.spaceUnits, ...fleet.groundUnits].some(unit =>
    UNITS[unit.unitTypeId]?.Static
  );
  if (hasStatic) {
    return { success: false, error: "Fleet contains static units and cannot jump" };
  }

  const hasMoved = [...fleet.spaceUnits, ...fleet.groundUnits].some(unit => unit.hasMoved);
  if (hasMoved) {
    return { success: false, error: "Fleet has already moved this turn" };
  }

  // === Execute the jump ===

  // Remove fleet from source system
  const sourceFleets = sourceSystem.fleetsInSpace[playerId];
  const fleetIndex = sourceFleets.findIndex(f => f.fleetId === fleetId);
  if (fleetIndex >= 0) {
    sourceFleets.splice(fleetIndex, 1);
  }

  // Mark all units in fleet as moved
  for (const unit of [...fleet.spaceUnits, ...fleet.groundUnits]) {
    unit.hasMoved = true;
  }

  // Mark bunker as used
  bunkerUnit.hasMoved = true;

  // Add fleet to target system
  if (!targetSystem.fleetsInSpace[playerId]) {
    targetSystem.fleetsInSpace[playerId] = [];
  }
  targetSystem.fleetsInSpace[playerId].push(fleet);

  // Auto-scan target if not already scanned
  if (!targetSystem.scannedBy) {
    targetSystem.scannedBy = [];
  }
  if (!targetSystem.scannedBy.includes(playerId)) {
    targetSystem.scannedBy.push(playerId);
  }

  // Auto-capture empty 0-dev systems
  if (!targetSystem.revealed && targetSystem.details?.dev === 0) {
    const hasOtherUnits = Object.entries(targetSystem.fleetsInSpace)
      .some(([owner, fleets]) => owner !== playerId && fleets.length > 0);

    if (!hasOtherUnits && !targetSystem.details.owner) {
      targetSystem.details.owner = playerId;
      targetSystem.revealed = true;
    }
  }

  return {
    success: true,
    stateChanges: state,
    message: `Jumped fleet from ${sourceHexId} to ${targetHexId}`,
  };
}
