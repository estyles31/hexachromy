import type { GameDefinition } from "../shared/models/GameDefinition";
import type { Player  } from "../shared/models/GameState";
import type { PlayerSummary } from "../shared/models/GameSummary";

export interface GameDatabaseAdapter {
  /** Reads a Firestore document by path and returns the typed data or null. */
  getDocument<T = unknown>(path: string): Promise<T | null>;
  /** Creates or overwrites a Firestore document with the provided data. */
  setDocument<T = unknown>(path: string, data: T): Promise<void>;
  /** Merges the provided fields into an existing Firestore document. */
  updateDocument(path: string, data: Record<string, unknown>): Promise<void>;
  /** Deletes a Firestore document. */
  deleteDocument(path: string): Promise<void>;
}

export interface GameStartContext {
  gameId: string;
  gameType: string;

  scenario: {
    id: string;
    playerCount: number;
  };

  players: Array<Player>;

  options: Record<string, unknown | null>;
  name?: string;

  db: GameDatabaseAdapter;
}


export interface CommitMoveContext<Move = unknown> {
  gameId: string;
  playerId: string;
  move: Move;
  db: GameDatabaseAdapter;
}

export interface GetLegalMovesContext<State = unknown> {
  gameId: string;
  playerId: string;
  db: GameDatabaseAdapter;
  /** Current state if already loaded by the caller. */
  state?: State;
}

export interface AddPlayerContext<State = unknown> {
  gameId: string;
  playerId: string;
  playerName: string;
  state: State;
  db: GameDatabaseAdapter;
}

export interface AddPlayerResult<State = unknown> {
  state: State;
  players?: PlayerSummary[];
  playerStatuses?: Record<string, PlayerSummary["status"]>;
}

export interface GameBackendModule<State = unknown, Move = unknown, LegalMoves = unknown> {
  id: string;
  createGame(context: GameStartContext): Promise<State> | State;
  commitMove(context: CommitMoveContext<Move>): Promise<State> | State;
  getLegalMoves(context: GetLegalMovesContext<State>): Promise<LegalMoves> | LegalMoves;
}

export interface GameModuleManifest {
  id: string;
  /** Relative path to the frontend entry point for this module (no imports here). */
  frontendEntry?: string;
  /** Relative path to the backend entry point for this module (no imports here). */
  backendEntry?: string;
}

export interface EnsureGameDefinitionContext {
  db: GameDatabaseAdapter;
}

export interface PrepareCreateGameContext {
  definition: GameDefinition | null;
  requestBody: Record<string, unknown>;
  creationOptions: Record<string, unknown>;
  players: PlayerSummary[];
  resolvedBoardId?: string;
  defaultScenario?: string;
}

export interface PrepareCreateGameResult {
  requiredPlayers?: number;
  scenario?: string;
  options?: Record<string, unknown>;
  players?: PlayerSummary[];
}

export interface GetPlayerViewContext {
  gameId: string;
  playerId: string;
  db: GameDatabaseAdapter;
}

