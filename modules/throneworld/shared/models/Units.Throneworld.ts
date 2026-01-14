import raw from "../data/units.throneworld.json";
import { getCodepointForIcon, type GlyphDef } from "../../../../shared/data/icoMoon";

export type Domain = "Space" | "Ground";

export interface ThroneworldUnitType {
  id: string; // used to define UnitTypeId, "F","M","A","C","bH", etc
  Name: string;
  Glyph: GlyphDef;
  Domain: Domain;
  Cost: number;

  // --- Common combat stats ---
  Attack?: number;
  Defense?: number;
  HP?: number;

  // Cargo: positive = capacity, negative = requires capacity
  Cargo?: number; // undefined → treat as 0

  // --- Special abilities ---
  Explore?: boolean; // Survey Team
  Static?: boolean; // Command Bunker, Shield
  Command?: boolean; // Command Bunkers
  FirstFire?: boolean; // Drop Infantry
  FirstDefend?: boolean; // Command Bunkers
  DropAttack?: boolean; // Drop Infantry
  Absorb?: number; // Shields absorb hits
  NonCombat?: boolean; // Survey Teams auto-lose in combat

  Restricted?: boolean; // Racial units

  // Defense bonuses (optional nested structure)
  DefenseBonus?: {
    [bonusType: string]: {
      [unitId: string]: number;
    };
  };
}

export const STAT_GLYPHS = {
  Attack: { icon: "tw-attack", unicode: "⚔", codepoint: getCodepointForIcon("tw-attack") },
  Defense: { icon: "tw-defense2", unicode: "🛡", codepoint: getCodepointForIcon("tw-defense2") },
  HP: { icon: "tw-hp", unicode: "❤", codepoint: getCodepointForIcon("tw-hp") },
  Cargo: { icon: "tw-cargo", unicode: "📦", codepoint: getCodepointForIcon("tw-cargo") },
  Cost: { icon: "tw-cost", unicode: "$", codepoint: getCodepointForIcon("tw-cost") },
} satisfies Record<string, GlyphDef>;

// Make the JSON strongly typed
const loadedUnits: Record<string, ThroneworldUnitType> = raw as Record<string, ThroneworldUnitType>;

export const UNITS = Object.fromEntries(Object.entries(loadedUnits).map(([id, u]) => [id, normalizeUnit(u)]));

// Export the unit ID type
export type UnitTypeId = keyof typeof UNITS;

export function normalizeUnit(u: ThroneworldUnitType) {
  const glyph = u.Glyph;

  if (glyph?.icon && !glyph.codepoint) {
    glyph.codepoint = getCodepointForIcon(glyph.icon);
  }

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
    Glyph: glyph,
  };
}

let unitIdCounter = 0;

export interface ThroneworldUnit {
  id: string;
  unitTypeId: UnitTypeId;
  hasMoved: boolean;
  owner?: string;
}

export function buildUnit(unitTypeId: UnitTypeId, owner?: string): ThroneworldUnit {
  return {
    id: generateUnitId(),
    unitTypeId,
    owner,
    hasMoved: false,
  };
}

/**
 * Generate a unique unit ID
 * Uses a simple counter for now - could use UUID in production
 */
export function generateUnitId(): string {
  return `unit_${Date.now()}_${unitIdCounter++}`;
}
