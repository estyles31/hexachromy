// /shared/models/ApiContexts.ts
import type { GameAction, StateDelta } from "./GameAction";
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

// ============================================================================
// Parameter Value Queries
// ============================================================================

export interface ParameterValuesContext {
  gameId: string;
  playerId: string;
  actionType: string;
  parameterName: string;
  partialParameters: Record<string, unknown>;  // Parameters filled so far
  db: GameDatabaseAdapter;
}

export interface ParameterValuesResponse {
  values: unknown[];  // Legal values for this parameter
  renderHint?: RenderHint;  // How to render the selection UI
  error?: string;
}

// ============================================================================
// Action History (for undo and history traversal)
// ============================================================================

export interface ActionHistoryEntry {
  actionId: string;
  sequence: number;  // Global sequence number for ordering
  timestamp: number;
  playerId: string;
  action: GameAction;
  stateChanges: StateDelta[];
  // undoAction - at some point may need to be supported - if there are reasons that just reversing state changes aren't good enough
  undoable: boolean;  // Can this be undone at this point in time?
  undone?: boolean;  // Has this action been undone? (for audit trail)
  resultingPhase: string;
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