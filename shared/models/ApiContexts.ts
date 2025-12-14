// /shared/models/ApiContexts.ts
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

export type RenderHintCategory = "button" | "hex-select" | "input" | "custom";

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

export interface ActionParameter {
  name: string;
  required: boolean;
  dependsOn?: string[];  // Names of parameters that must be filled first
  renderHint?: RenderHint;
}

export interface GameAction {
  type: string;
  undoable: boolean;
  expectedVersion?: number;  // For optimistic concurrency control
  renderHint?: RenderHint;   // Optional hint for frontend rendering
  
  // Multi-parameter action support
  parameters?: ActionParameter[];  // If present, action needs parameters filled
  
  [key: string]: unknown;
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

export interface ActionResponse {
  success: boolean;
  message?: string;
  stateChanges?: unknown;
  undoAction?: GameAction;  // How to reverse this action (if undoable)
  error?: string;
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
  undoAction?: GameAction;
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