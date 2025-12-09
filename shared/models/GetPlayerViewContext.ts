import type { GameDatabaseAdapter } from "./GameDatabaseAdapter"

export interface GetPlayerViewContext {
  gameId: string;
  playerId: string;
  db: GameDatabaseAdapter;
}