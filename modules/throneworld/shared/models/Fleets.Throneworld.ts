// /modules/throneworld/shared/models/Fleets.Throneworld.ts
import type { ThroneworldUnit } from "./Unit.Throneworld";
import { UNITS } from "./UnitTypes.ThroneWorld";

export interface Fleet {
  id: string;
  owner: string;
  spaceUnits: ThroneworldUnit[];
  groundUnits: ThroneworldUnit[];
}

export function getCargo(fleet: Fleet) {
  let c = 0;
  for (const u of fleet.spaceUnits) {
    c += UNITS[u.unitTypeId].Cargo ?? 0;
  }

  for (const u of fleet.groundUnits) {
    c += UNITS[u.unitTypeId].Cargo ?? 0;
  }

  return c;
}

let fleetIdCounter = 0;

/**
 * Generate a unique fleet ID
 * Uses a simple counter for now - could use UUID in production
 */
export function generateFleetId(): string {
  return `fleet_${Date.now()}_${fleetIdCounter++}`;
}

export function createFleet(firstUnit: ThroneworldUnit): Fleet {
  const fleet: Fleet = {
    id: generateFleetId(),
    owner: firstUnit.owner ?? "neutral",
    spaceUnits: [],
    groundUnits: [],
  };

  return addUnitToFleet(fleet, firstUnit);
}

export function createEmptyFleet(owner: string): Fleet {
  const fleet: Fleet = {
    id: generateFleetId(),
    owner,
    spaceUnits: [],
    groundUnits: [],
  };

  return fleet;
}

//todo: validate cargo space
export function addUnitToFleet(fleet: Fleet, unit: ThroneworldUnit): Fleet {
  if (UNITS[unit.unitTypeId]?.Domain === "Ground") {
    fleet.groundUnits ??= [];
    fleet.groundUnits.push(unit);
  } else {
    fleet.spaceUnits ??= [];
    fleet.spaceUnits.push(unit);
  }
  return fleet;
}

export function fleetHasMoved(fleet: Fleet) {
  return fleet.groundUnits.some((g) => g.hasMoved) || fleet.spaceUnits.some((s) => s.hasMoved);
}
