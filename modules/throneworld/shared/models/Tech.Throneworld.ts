// /modules/throneworld/shared/models/Tech.Throneworld.ts

import { getCodepointForIcon, type GlyphDef } from "../../../../shared/data/icoMoon";

export interface TechLevel {
  currentBox: number; // 1-12
  bonus: number; // +1 for specialists, 0 otherwise
}

export type TechCategory = "Ground" | "Space" | "Jump" | "Comm";

export interface PlayerTech {
  Ground: TechLevel;
  Space: TechLevel;
  Jump: TechLevel;
  Comm: TechLevel;
}

export const TECH_GLYPHS = {
  Ground: { icon: "tw-ground", unicode: "⚔️", codepoint: getCodepointForIcon("tw-ground") },
  Space: { icon: "tw-space", unicode: "🚀", codepoint: getCodepointForIcon("tw-space") },
  Jump: { icon: "tw-jump", unicode: "↗️", codepoint: getCodepointForIcon("tw-jump") },
  Comm: { icon: "tw-comm", unicode: "📡", codepoint: getCodepointForIcon("tw-comm") },
  Resources: { icon: "tw-resources", unicode: "", codepoint: getCodepointForIcon("tw-resources") },
} satisfies Record<string, GlyphDef>;

// Lookup table: box number → base level
const BOX_TO_BASE_LEVEL: Record<number, number> = {
  1: 1,
  2: 2,
  3: 2,
  4: 3,
  5: 3,
  6: 4,
  7: 4,
  8: 4,
  9: 5,
  10: 5,
  11: 5,
  12: 6,
};

const MAX_BOX = 12;

/**
 * Get the base level for a given box number
 */
export function getBaseLevel(currentBox: number): number {
  return BOX_TO_BASE_LEVEL[currentBox] ?? 1;
}

/**
 * Get the effective level (what the tech actually does in gameplay)
 */
export function getEffectiveLevel(tech: TechLevel): number {
  if (!tech) return 1;
  return getBaseLevel(tech.currentBox) + tech.bonus;
}

/**
 * Check if advancing from this box is automatic (box 1 always succeeds)
 */
export function canAutoAdvance(tech: TechLevel): boolean {
  return tech.currentBox === 1;
}

/**
 * Get the target number to roll to advance (roll >= this number)
 */
export function getAdvanceTarget(tech: TechLevel): number {
  return getBaseLevel(tech.currentBox);
}

/**
 * Check if tech is at maximum box
 */
export function isAtMaxBox(tech: TechLevel): boolean {
  return tech.currentBox >= MAX_BOX;
}

/**
 * Attempt to advance tech. Returns new tech level if successful, null if failed.
 * @param tech Current tech level
 * @param roll Die roll (1-6)
 * @returns New tech level if successful, null if failed or at max
 */
export function attemptAdvance(tech: TechLevel, roll: number): TechLevel | null {
  if (isAtMaxBox(tech)) return null;

  const target = getAdvanceTarget(tech);
  const success = roll >= target || canAutoAdvance(tech);

  if (!success) return null;

  return {
    currentBox: tech.currentBox + 1,
    bonus: tech.bonus,
  };
}

export function initializePlayerTech(): PlayerTech {
  return {
    Ground: { currentBox: 1, bonus: 0 },
    Space: { currentBox: 1, bonus: 0 },
    Jump: { currentBox: 1, bonus: 0 },
    Comm: { currentBox: 1, bonus: 0 },
  };
}
