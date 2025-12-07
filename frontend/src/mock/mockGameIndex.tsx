import type { GameSummary } from "../../../shared/models/GameSummary";

export const mockGames: GameSummary[] = [
  {
    id: "game1",
    name: "Throne World #1",
    players: [
      { id: "alice", name: "Alice", status: "joined" },
      { id: "bob", name: "Bob", status: "joined" },
    ],
    status: "in-progress",
    gameType: "throneworld",
  },
  {
    id: "game2",
    name: "Throne World #2",
    players: [{ id: "carol", name: "Carol", status: "joined" }],
    status: "waiting",
    gameType: "throneworld",
  },
];
