//modules/throneworld/shared/models/Systems.Throneworld.ts
import type { ColumnId, WorldType } from "./BoardLayout.ThroneWorld";
import { createFleet, type Fleet } from "./Fleets.Throneworld";
import type { ThroneworldUnit } from "./Unit.Throneworld";
import type { UnitId } from "./UnitTypes.ThroneWorld";
import { UNITS } from "./UnitTypes.ThroneWorld";

export type UnitCountMap = Partial<Record<UnitId, number>>;

export interface ThroneworldSystemDetails {
  dev: number;
  systemId?: string;
  owner?: string;
  spaceTech: number;         // Neutral space units tech level
  groundTech: number;        // Neutral ground units tech level
  spaceUnits: UnitCountMap;  // Neutral space units printed on tile
  groundUnits: UnitCountMap; // Neutral ground units printed on tile
}

export interface HexLocation {
  col: ColumnId;
  row: number;
}

export interface ThroneworldPublicSystemState {
  hexId: string;
  location: HexLocation;
  worldType: WorldType;
  revealed: boolean;
  scannedBy: string[];

  /** Present when the hex has been revealed publicly. */
  details?: ThroneworldSystemDetails;
  
  unitsOnPlanet: Record<string, ThroneworldUnit[]>;       // By playerId
  fleetsInSpace: Record<string, Fleet[]>;        // By playerId
}

export function addUnitToSystem(system: ThroneworldPublicSystemState, unit: ThroneworldUnit) {
  const owner = unit.owner ?? "neutral";
  
  if(UNITS[unit.unitTypeId]?.Type == "Ground") {
    system.unitsOnPlanet[owner] ??= [];
    system.unitsOnPlanet[owner].push(unit);
  } else {
    system.fleetsInSpace[owner] ??= [];
    system.fleetsInSpace[owner].push(createFleet(unit));
  }
}

export interface SystemPool {
  Outer: ThroneworldSystemDetails[];
  Inner: ThroneworldSystemDetails[];
  Fringe: ThroneworldSystemDetails[];
  Throneworld: ThroneworldSystemDetails[];
}