// /shared/models/ActionParams.ts
/**
 * Base parameter types that the framework understands
 */
export type ParamType = "boardSpace" | "gamePiece" | "choice" | "number" | "text";


/**
 * Represents a single selected item on the board
 */
export interface GameObject {
  type: ParamType;
  subtype?: string;                    // "hex", "fleet", "unit", etc.
  id: string;                          // Unique identifier
  metadata?: Record<string, unknown>;  // Game-specific data
}


/**
 * Definition of a single action parameter
 */
export interface ActionParam<T = string> {
  name: string;
  type: ParamType;
  optional?: boolean;                  // optional parameter?  defaults to false
  subtype?: string;                    // Game-specific: "hex", "fleet", "unit", etc.
  filter?: Record<string, unknown>;    // Game-specific filters passed to backend
  dependsOn?: string;                  // Name of param that must be filled first
  message?: string;                    // Hint shown to player when selecting this param
  value?: T | null;                    // value that can be passed back - can be set to a value as the default
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
