export type GameStatus = "waiting" | "in-progress" | "completed";

export interface GameSummary {
  id: string;
  name: string;
  players: string[];
  status: GameStatus;
}
