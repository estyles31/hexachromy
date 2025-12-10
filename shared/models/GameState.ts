import type { ActionHistoryEntry } from "./ApiContexts";

export type PlayerStatus = "joined" | "invited" | "dummy";
export type GameStatus = "waiting" | "in-progress";

export interface Player {
    uid: string;
    status: PlayerStatus;
    displayName?: string;
}

export interface GameState<State = unknown> {
  gameId: string;
  /** Stable string for the game name, i.e. "throneworld" */
  gameType: string;
  /** Game-specific state tree, already redacted for public visibility. */
  state: State;

  /** The name of the current game. Optional. */
  name?: string;

  /** Player list. */
  players: Record<string, Player>;

  /** Options set at game creation */
  options: Record<string, unknown | null>;

  createdAt: number;
  status: GameStatus;
  
  /** Version number for optimistic concurrency control - incremented on every state change */
  version: number;
  
  /** Next sequence number for action log */
  actionSequence: number;
  
  /** Per-player undo stacks - only actions they can currently undo (up to their undo boundary) */
  playerUndoStacks?: Record<string, ActionHistoryEntry[]>;
}
