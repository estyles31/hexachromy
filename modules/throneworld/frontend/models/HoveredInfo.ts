import type { ThroneworldSystemDetails } from "../../shared/models/Systems.ThroneWorld";
import type { ThroneworldUnit } from "../../shared/models/Unit.Throneworld";
import type { ThroneworldUnitType } from "../../shared/models/UnitTypes.ThroneWorld";

export type HoveredInfo = HoveredSystemInfo | HoveredFleetInfo | HoveredUnitInfo;

export interface HoveredSystemInfo {
  kind: "system";
  hexId: string;
  worldType?: string;
  revealed: boolean;
  canPeek: boolean;
  details?: ThroneworldSystemDetails;
}

export interface HoveredFleetInfo {
  kind: "fleet";
  fleetId: string;
  hexId: string;
  owner: string;
  spaceUnits: ThroneworldUnit[];
  groundUnits: ThroneworldUnit[];
}

export interface HoveredUnitInfo {
  kind: "unit";
  unitId: string;
  hexId?: string;
  unit: ThroneworldUnit;
  quantity: number;
  unitDef: ThroneworldUnitType;
}
