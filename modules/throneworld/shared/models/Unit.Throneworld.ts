// /modules/throneworld/shared/models/Unit.Throneworld.ts
import type { UnitId } from "./UnitTypes.ThroneWorld";

let unitIdCounter = 0;

export interface ThroneworldUnit {
  unitId: string;
  unitTypeId: UnitId;
  hasMoved: boolean;
  owner?: string;
}

export function buildUnit(unitTypeId:UnitId, owner?:string) : ThroneworldUnit {
    return {
        unitId: generateUnitId(),
        unitTypeId,
        owner,
        hasMoved: false
    };
}

/**
 * Generate a unique unit ID
 * Uses a simple counter for now - could use UUID in production
 */
export function generateUnitId(): string {
  return `unit_${Date.now()}_${unitIdCounter++}`;
}