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

export interface CreateGameContext<State = unknown> {
  gameId: string;
  playerIds: string[];
  scenario?: string;
  db: GameDatabaseAdapter;
  /** Optional opaque metadata forwarded from the base API layer. */
  options?: Record<string, unknown>;
  /** The module must return the initial state for persistence. */
  returnState?: (state: State) => void;
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

export interface GameBackendModule<State = unknown, Move = unknown, LegalMoves = unknown> {
  id: string;
  createGame(context: CreateGameContext<State>): Promise<State> | State;
  commitMove(context: CommitMoveContext<Move>): Promise<State> | State;
  getLegalMoves(context: GetLegalMovesContext<State>): Promise<LegalMoves> | LegalMoves;
}

export interface GameModuleManifest {
  id: string;
  frontend?: unknown;
  backend: GameBackendModule;
}
