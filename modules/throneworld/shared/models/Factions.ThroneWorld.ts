// /modules/throneworld/shared/models/Factions.Throneworld.ts
import raw from "../data/races.throneworld.json";
import type { PlayerTech } from "./Tech.Throneworld";

export interface ThroneworldFaction {
  id: string; // "B", "P", "Q", "T", "V", "Z"
  Name: string;

  CanBuild?: string[];
  CannotBuild?: string[];

  StartingTech: PlayerTech;
  BuildDiscount?: Record<string, number>;

  SpecialAbility?: {
    FreeHWReturn?: number;
    TechReroll?: number;
  };

  ProductionBonus?: Record<string, number>;
}

// Make the JSON strongly typed
const loadedRaces: Record<string, ThroneworldFaction> = raw as Record<string, ThroneworldFaction>;

export const Factions = Object.fromEntries(Object.entries(loadedRaces).map(([id, r]) => [id, r]));

// Export the Faction ID type
export type FactionID = keyof typeof Factions;
