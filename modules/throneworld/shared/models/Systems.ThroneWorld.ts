import type { UnitId } from "./UnitTypes.ThroneWorld.ts";

export type UnitCountMap = Partial<Record<UnitId, number>>;

export interface SystemDefinition {
  dev: number;
  spaceTech: number;
  groundTech: number;
  spaceUnits: UnitCountMap;
  groundUnits: UnitCountMap;
}

export interface SystemPool {
  outer: SystemDefinition[];
  inner: SystemDefinition[];
  fringe: SystemDefinition[];
  throneworld: SystemDefinition[];
}

declare const value: SystemPool;
export default value;