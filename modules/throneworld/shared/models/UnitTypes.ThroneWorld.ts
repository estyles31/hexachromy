import raw from "../data/units.throneworld.json";
import type { ThroneworldUnit } from "./UnitType.ThroneWorld";

// Make the JSON strongly typed
const loadedUnits: Record<string, ThroneworldUnit> = raw as Record<
  string,
  ThroneworldUnit
>;

export const UNITS = Object.fromEntries(
  Object.entries(loadedUnits).map(([id, u]) => [id, normalizeUnit(u)])
);

// Export the unit ID type
export type UnitId = keyof typeof UNITS;

export function normalizeUnit(u: ThroneworldUnit) {
  return {
    Attack: 0,
    Defense: 0,
    HP: 1,
    Cargo: 0,
    Explore: false,
    Static: false,
    Command: false,
    FirstFire: false,
    FirstDefend: false,
    DropAttack: false,
    Restricted: false,
    Absorb: 0,
    DefenseBonus: {},
    ...u,
  };
}