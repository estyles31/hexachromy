// /shared/models/ActionParams.ts

/**
 * Base parameter types that the framework understands
 */
export type ParamType = "boardSpace" | "gamePiece" | "choice" | "number" | "text";

/**
 * Definition of a single action parameter
 */
export interface ActionParam {
  name: string;
  type: ParamType;
  subtype?: string;                    // Game-specific: "hex", "fleet", "unit", etc.
  filter?: Record<string, unknown>;    // Game-specific filters passed to backend
  dependsOn?: string;                  // Name of param that must be filled first
  message?: string;                    // Hint shown to player when selecting this param
}

/**
 * How an action is finalized after all params are collected
 */
export interface ActionFinalize {
  mode: "auto" | "confirm";
  label?: string;                      // Static label for confirm button
}

/**
 * Defines what selection can initiate an action
 */
export interface ActionInitiator {
  type: ParamType;
  subtype?: string;
  filter?: Record<string, unknown>;
  fillsParam?: string;                 // Which param gets auto-filled by the initiator
}

/**
 * Full definition of an action with its parameters
 */
export interface ActionDefinition {
  type: string;
  undoable: boolean;
  params: ActionParam[];
  initiatedBy?: ActionInitiator;       // What selection can START this action
  finalize: ActionFinalize;
  renderHint?: {
    category?: string;
    icon?: string;
    label?: string;
    description?: string;
  };
}

/**
 * A legal choice for a parameter value
 */
export interface LegalChoice {
  id: string;                          // ID to send back when selected
  type: ParamType;
  subtype?: string;
  displayHint?: {
    hexId?: string;                    // For board space highlighting
    pieceId?: string;                  // For piece highlighting  
    label?: string;                    // For list/dropdown display
  };
  metadata?: Record<string, unknown>;  // Game-specific info for dynamic labels
}

/**
 * Response from backend when querying legal choices for a param
 */
export interface ParamChoicesResponse {
  choices: LegalChoice[];
  message?: string;                    // Message to show player
  error?: string;
  
  // For finalization when this param would complete the action
  finalizeLabel?: string;              // Dynamic label for confirm button
  finalizeMetadata?: Record<string, unknown>;  // Flags for building dynamic label
}

/**
 * Context for requesting param choices from backend
 */
export interface ParamChoicesContext {
  gameId: string;
  playerId: string;
  actionType: string;
  paramName: string;
  filledParams: Record<string, string>;
}
