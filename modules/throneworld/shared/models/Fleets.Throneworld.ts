// /modules/throneworld/shared/models/Fleets.Throneworld.ts
import type { ThroneworldUnit } from "./Unit.Throneworld";
import { UNITS } from "./UnitTypes.ThroneWorld";

export interface Fleet {
  fleetId: string;
  owner: string;
  spaceUnits:  ThroneworldUnit[];
  groundUnits: ThroneworldUnit[];
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
        fleetId: generateFleetId(),
        owner: firstUnit.owner ?? "neutral",
        spaceUnits: [],
        groundUnits: [],
    };

    return addUnitToFleet(fleet, firstUnit);
}

//todo: validate cargo space
export function addUnitToFleet(fleet: Fleet, unit: ThroneworldUnit): Fleet {
    if (UNITS[unit.unitTypeId]?.Type === "Ground") {
        fleet.groundUnits ??= [];
        fleet.groundUnits.push(unit);
    } else {
        fleet.spaceUnits ??= [];
        fleet.spaceUnits.push(unit);
    }
    return fleet;
}