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

  Restricted?: boolean;  // Racial units

  // Defense bonuses (optional nested structure)
  DefenseBonus?: {
    [bonusType: string]: {
      [unitId: string]: number;
    };
  };
}
