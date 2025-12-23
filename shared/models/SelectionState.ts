// /shared/models/SelectionState.ts

import type { GameObject } from "./ActionParams";

/**
 * Current selection state
 */
export interface SelectionState {
  /** Currently selected items in order of selection */
  items: GameObject[];
  
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