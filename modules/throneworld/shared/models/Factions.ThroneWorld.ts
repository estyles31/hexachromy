// /modules/throneworld/shared/models/Factions.ThroneWorld.ts
import raw from "../data/races.throneworld.json";

export interface ThroneworldFaction {
  id: string;            // "B", "P", "Q", "T", "V", "Z"
  Name: string;
  
  CanBuild?: string[];
  CannotBuild?: string[];

  StartingTech: { 
    Ground: number,
    Space: number,
    Jump: number,
    Comm: number
   };
  
  TechBonus?: Record<string, number>;
  BuildDiscount?: Record<string, number>; 

  SpecialAbility?: {
    FreeHWReturn?: number,
    TechReroll?: number,
  }

  ProductionBonus?: Record<string, number>
}


// Make the JSON strongly typed
const loadedRaces: Record<string, ThroneworldFaction> = raw as Record<
  string,
  ThroneworldFaction
>;

export const Factions = Object.fromEntries(
  Object.entries(loadedRaces).map(([id, r]) => [id, r])
);

// Export the Faction ID type
export type FactionID = keyof typeof Factions;