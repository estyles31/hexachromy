// /modules/throneworld/shared/models/Faction.ThroneWorld.ts

export interface ThroneworldFaction {
  id: string;            // "B", "P", "Q", "T", "V", "Z"
  Name: string;
  
  CanBuild?: string;
  CannotBuild?: string;

  StartingTech: { 
    Ground: number,
    Space: number,
    Jump: number,
    Comm: number
   };
  
  TechBonus?: Record<string, number>;

  SpecialAbility?: {
    FreeHWReturn?: number,
    TechReroll?: number,
  }

  ProductionBonus?: Record<string, number>
}
