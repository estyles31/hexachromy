import type { ActionParam } from "./ActionParams";
import type { GameState } from "./GameState";

export interface StateDelta {
  path: string;          
  oldValue: any;         
  newValue: any;         
  visibility: "public" | "owner" | "hidden";
  ownerId?: string;      
}

export interface ActionResponse {
  action: GameAction;
  success: boolean;
  message?: string;
  stateChanges?: StateDelta[];
  undoable?: boolean;
  error?: string;
}

/**
 * How an action is finalized after all params are collected
 */
export interface ActionFinalize {
  mode: "auto" | "confirm";
  label?: string;                      // Static label for confirm button
  warnings?: string[];
}

export abstract class GameAction {
  /** Required basic identity & undo semantics */
  readonly type: string;
  undoable: boolean;

  /** Server-side execution metadata */
  expectedVersion?: number;              // optimistic concurrency
  undoAction?: GameAction;               // how to reverse this action, if undoable

  /** Parameters needed before execution */
  params: ActionParam<any>[] = [];                // UI/logic parameter definitions

  /** Optional UI rendering info */
  //renderHint?: RenderHint;               // currently not used

  /** Optional finalize mode */
  finalize?: ActionFinalize;             // confirm button rules

  /** Free-form, game-specific metadata (safe extension point) */
  [key: string]: unknown;

  constructor(init: {
    type: string;
    undoable: boolean;
    params?: ActionParam<unknown>[];
    finalize?: ActionFinalize;
  }) {
    this.type = init.type;
    this.undoable = init.undoable;

    this.params = init.params ?? [];
    this.finalize = init.finalize;
  }

  abstract execute(state: GameState, playerId: string): Promise<ActionResponse>;
  abstract getParamChoices(state: GameState, playerId: string, paramName: string): any;

  isParamComplete(name: string): boolean {
    return this.params.find(p => p.name === name)?.value !== undefined;
  }

  allParamsComplete(): boolean {
    return this.params.every(p => p.optional === false || p.value !== undefined);
  }

  setParamValue(name: string, val: string) {
    const param = this.params.find(p => p.name === name);
    if (!param) throw new Error(`Unknown param: ${name}`);
    param.value = val;
  }

  getFinalizeInfo(_state: GameState, _playerId: string): ActionFinalize | null {
    return this.finalize ?? null;
  }

  getParamValue(name: string) {
    return this.params.find(p => p.name === name)?.value;
  }

  getStringParam(name: string) {
    const v = this.getParamValue(name);
    return typeof v === "string" ? v.trim() : undefined;
  }

  get paramMap() {
    return Object.fromEntries(this.params.map(p => [p.name, p.value]));
  }
}