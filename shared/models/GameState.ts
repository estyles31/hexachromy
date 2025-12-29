export type PlayerStatus = "joined" | "invited" | "dummy";
export type GameStatus = "waiting" | "in-progress";

export interface Player {
    uid: string;
    status: PlayerStatus;
    displayName?: string;
}

export interface BaseState {
  currentPlayers?: string[];
  currentPhase: string;
  phaseMetadata?: Record<string, unknown>; // Phase-specific temporary state
}

export interface GameState<State = BaseState> {
  gameId: string;
  /** Stable string for the game name, i.e. "throneworld" */
  gameType: string;
  /** Game-specific state tree, already redacted for public visibility. */
  state: State;

  /** The name of the current game. Optional. */
  name?: string;

  /** Player list. */
  players: Record<string, Player>;

  // this controls how the players are listed in the interface, and can be used by the module however you want
  playerOrder: string[]; 

  /** Options set at game creation */
  options: Record<string, unknown | null>;

  createdAt: number;
  status: GameStatus;
  
  /** Version number for optimistic concurrency control - incremented on every state change */
  version: number;
  
  /** Next sequence number for action log */
  actionSequence: number;
  
  playerViews?: Record<string, any>; // Per-player hidden, if any

  /** Per-player undo stacks - only actions they can currently undo (up to their undo boundary) */
  // playerUndoStacks?: Record<string, ActionHistoryEntry[]>;
}
