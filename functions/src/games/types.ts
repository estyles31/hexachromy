import { Firestore } from "firebase-admin/firestore";

export interface GameStateContext {
  db: Firestore;
  gameId: string;
  gameData: FirebaseFirestore.DocumentData;
  definitionData?: FirebaseFirestore.DocumentData;
}

export interface GameModule {
  /** Unique identifier for the game implementation (e.g., "throneworld"). */
  type: string;
  /** Optional seed routine to prime Firestore with game definition and demos. */
  seed?(db: Firestore): Promise<void>;
  /** Returns a viewer-ready game state snapshot. */
  getGameState(context: GameStateContext): Promise<Record<string, unknown>>;
}
