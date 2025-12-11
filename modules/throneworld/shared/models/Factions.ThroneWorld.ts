// /modules/throneworld/shared/models/Factions.ThroneWorld.ts
import raw from "../data/races.throneworld.json";
import type { ThroneworldFaction } from "./Faction.ThroneWorld";

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