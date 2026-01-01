import raw from "../data/units.throneworld.json";

export type UnitType = "Space" | "Ground";

export interface ThroneworldUnitType {
  id: string;            // used to define UnitTypeId, "F","M","A","C","bH", etc
  Name: string;
  Symbol: string;
  Type: UnitType;
  Cost: number;

  // --- Common combat stats ---
  Attack?: number;
  Defense?: number;
  HP?: number;

  // Cargo: positive = capacity, negative = requires capacity
  Cargo?: number;        // undefined → treat as 0

  // --- Special abilities ---
  Explore?: boolean;     // Survey Team
  Static?: boolean;      // Command Bunker, Shield
  Command?: boolean;     // Command Bunkers
  FirstFire?: boolean;   // Drop Infantry
  FirstDefend?: boolean; // Command Bunkers
  DropAttack?: boolean;  // Drop Infantry
  Absorb?: number;       // Shields absorb hits
  NonCombat?: boolean;   // Survey Teams auto-lose in combat

  Restricted?: boolean;  // Racial units

  // Defense bonuses (optional nested structure)
  DefenseBonus?: {
    [bonusType: string]: {
      [unitId: string]: number;
    };
  };
}

// Make the JSON strongly typed
const loadedUnits: Record<string, ThroneworldUnitType> = raw as Record<
  string,
  ThroneworldUnitType
>;

export const UNITS = Object.fromEntries(
  Object.entries(loadedUnits).map(([id, u]) => [id, normalizeUnit(u)])
);

// Export the unit ID type
export type UnitTypeId = keyof typeof UNITS;

export function normalizeUnit(u: ThroneworldUnitType) {
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