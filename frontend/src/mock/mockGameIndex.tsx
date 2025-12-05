import type { GameSummary } from "../../../shared/models/GameSummary";

export const mockGames: GameSummary[] = [
  {
    id: "game1",
    name: "Throne World #1",
    players: ["Alice", "Bob"],
    status: "in-progress",
    gameType: "throneworld"
  },
  {
    id: "game2",
    name: "Throne World #2",
    players: ["Carol"],
    status: "waiting",
    gameType: "throneworld"
  }
];
