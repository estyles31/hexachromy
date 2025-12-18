// /shared/models/SelectionState.ts

import type { ParamType } from "./ActionParams";

/**
 * Represents a single selected item on the board
 */
export interface SelectedItem {
  type: ParamType;
  subtype?: string;                    // "hex", "fleet", "unit", etc.
  id: string;                          // Unique identifier
  metadata?: Record<string, unknown>;  // Game-specific data
}

/**
 * Current selection state
 */
export interface SelectionState {
  /** Currently selected items in order of selection */
  items: SelectedItem[];
  
  /** Action type being built, if user has committed to a specific action */
  activeActionType?: string;
  
  /** Parameter values collected so far, keyed by param name */
  filledParams: Record<string, string>;
}

/**
 * Empty selection state
 */
export const EMPTY_SELECTION: SelectionState = {
  items: [],
  filledParams: {},
};