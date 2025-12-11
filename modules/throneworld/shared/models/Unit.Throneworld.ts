import type { UnitId } from "./UnitTypes.ThroneWorld";

export interface ThroneworldUnit {
  unitTypeId: UnitId;
  hasMoved: boolean;
  owner?: string;
}

export function buildUnit(unitTypeId:UnitId, owner?:string) : ThroneworldUnit {
    return {
        unitTypeId,
        owner,
        hasMoved: false
    };
}