import type { GameDatabaseAdapter } from "./GameDatabaseAdapter";
import type { GameState } from "./GameState";

export interface PhaseContext {
  gameState: GameState;
  db: GameDatabaseAdapter;
}
