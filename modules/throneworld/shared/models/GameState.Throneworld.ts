import type { SystemDefinition } from "./Systems.ThroneWorld";

export interface ThroneworldSystemState extends SystemDefinition {
  systemId: string;
  revealed: boolean;
  owner: string | null;
}

export interface ThroneworldGameState {
  gameId: string;
  createdAt: number;
  scenario: string;
  playerIds: string[];
  systems: Record<string, ThroneworldSystemState>;
  gameType: "throneworld";
}
