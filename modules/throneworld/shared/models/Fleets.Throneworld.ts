import type { ThroneworldUnit } from "./Unit.Throneworld";
// import { randomUUID } from "crypto";
import { UNITS } from "./UnitTypes.ThroneWorld";

export interface Fleet {
  fleetId: string;
  owner: string;
  spaceUnits:  ThroneworldUnit[],
  groundUnits: ThroneworldUnit[],
}

export function createFleet(firstUnit: ThroneworldUnit) : Fleet {
    const fleet = { 
        fleetId: "id",
        owner: firstUnit.owner ?? "neutral",
        spaceUnits: [],
        groundUnits: [],
    }

    return addUnitToFleet(fleet, firstUnit);
}

//todo: validate cargo space
export function addUnitToFleet(fleet: Fleet, unit: ThroneworldUnit) : Fleet {
    if(UNITS[unit.unitTypeId]?.Type === "Ground") {
        fleet.groundUnits ??= [];
        fleet.groundUnits.push(unit);
    } else {
        fleet.spaceUnits ??= [];
        fleet.spaceUnits.push(unit);
    }
    return fleet;
}