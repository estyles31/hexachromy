import type { GameSummary } from "../../../shared/models/GameSummary";

export const mockGames: GameSummary[] = [
  {
    id: "throneworld-demo",
    name: "Throneworld In-Progress Demo",
    players: ["Alice", "Bob", "Carol"],
    status: "in-progress"
  },
  {
    id: "game1",
    name: "Throne World #1",
    players: ["Alice", "Bob"],
    status: "in-progress"
  },
  {
    id: "game2",
    name: "Throne World #2",
    players: ["Carol"],
    status: "waiting"
  }
];
