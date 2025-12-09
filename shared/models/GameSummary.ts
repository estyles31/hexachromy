import type { PlayerStatus } from "./GameState";
export type GameStatus = "waiting" | "in-progress" | "completed";

export interface PlayerSummary {
  id: string;
  name: string;
  status: PlayerStatus;
}

export interface GameSummary {
  id: string;
  name: string;
  players: PlayerSummary[];
  status: GameStatus;
  gameType: string;
  options?: Record<string, unknown>;
}
