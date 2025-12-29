// /modules/throneworld/shared/models/Unit.Throneworld.ts
import type { UnitTypeId } from "./UnitTypes.ThroneWorld";

let unitIdCounter = 0;

export interface ThroneworldUnit {
  id: string;
  unitTypeId: UnitTypeId;
  hasMoved: boolean;
  owner?: string;
}

export function buildUnit(unitTypeId:UnitTypeId, owner?:string) : ThroneworldUnit {
    return {
        id: generateUnitId(),
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