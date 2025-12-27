// /shared/models/ApiContexts.ts
import type { GameAction } from "./GameAction";
import type { GameDatabaseAdapter } from "./GameDatabaseAdapter";
import type { PlayerSlot } from "./PlayerSlot";

// ============================================================================
// Game Creation
// ============================================================================

export interface GameStartContext {
  gameId: string;
  gameType: string;
  scenario: {
    id: string;
    playerCount: number;
  };
  playerSlots: PlayerSlot[];
  options: Record<string, unknown | null>;
  name?: string;
  db: GameDatabaseAdapter;
}

// ============================================================================
// Player View
// ============================================================================

export interface GetPlayerViewContext {
  gameId: string;
  playerId: string;
  db: GameDatabaseAdapter;
}

// ============================================================================
// Actions and Legal Actions
// ============================================================================

export type RenderHintCategory = "button" | "select" | "input" | "custom";

export interface RenderHint {
  category: RenderHintCategory;
  label?: string;
  description?: string;
  icon?: string;
  
  // For hex-select or other board interactions
  highlightHexes?: string[];
  message?: string;
  
  // For custom components
  customComponent?: string;
}

export interface LegalActionsContext {
  gameId: string;
  playerId: string;
  db: GameDatabaseAdapter;
}

export interface LegalActionsResponse {
  actions: GameAction[];
  message?: string;
  canUndo?: boolean;  // Can the player undo their last action?
}

export interface ActionContext {
  gameId: string;
  playerId: string;
  action: GameAction;
  db: GameDatabaseAdapter;
}

export interface UndoContext {
  gameId: string;
  playerId: string;
  expectedVersion?: number;  // For optimistic concurrency control
  db: GameDatabaseAdapter;
}

export interface UndoResponse {
  success: boolean;
  message?: string;
  error?: string;
}