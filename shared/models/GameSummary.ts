import type { PlayerStatus } from "./GameState";
export type GameStatus = "waiting" | "in-progress" | "completed";

export interface PlayerSummary {
  id: string;
  name: string;
  status: PlayerStatus;
  race?: string;
}

export interface GameSummary {
  id: string;
  name: string;
  players: PlayerSummary[];
  status: GameStatus;
  gameType: string;
  options?: Record<string, unknown>;
}

// Enriched summary with current game state info
export interface EnrichedGameSummary extends GameSummary {
  currentPhase?: string;
  currentPlayers?: string[]; // Display names of current players
  lastUpdated: number;
  isUserTurn: boolean; // Is the current user in currentPlayers?
}