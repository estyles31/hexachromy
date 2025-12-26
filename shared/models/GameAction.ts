import type { ActionParam } from "./ActionParams";
import type { GameState } from "./GameState";

export interface ActionResponse {
  action: GameAction | IAction;
  success: boolean;
  message?: string;
  undoable?: boolean;
  error?: string;
  phaseTransition?: PhaseTransition;
}

export interface PhaseTransition {
  nextPhase: string;
  transitionType: "nextPhase" | "subPhase" | "temporary";
  runPhaseStart?: boolean;  //default = true
}

/**
 * How an action is finalized after all params are collected
 */
export interface ActionFinalize {
  mode: "auto" | "confirm";
  label?: string;                      // Static label for confirm button
  warnings?: string[];
}

export interface IAction<T = Record<string, unknown>> {
  readonly type: string;
  undoable: boolean;
  expectedVersion?: number;
  metadata: Partial<T>;
}

export class SystemAction<T = Record<string, unknown>> implements IAction<T> {
  type = "system";
  undoable = false;
  expectedVersion?: number | undefined;
  metadata: Partial<T> = {};
}

export abstract class GameAction<T = Record<string, unknown>> implements IAction<T> {
  /** Required basic identity & undo semantics */
  readonly type: string;
  undoable: boolean;

  /** Server-side execution metadata */
  expectedVersion?: number;              // optimistic concurrency
  undoAction?: GameAction;               // how to reverse this action, only if special handling needed

  /** Parameters needed before execution */
  params: ActionParam<any>[] = [];                // UI/logic parameter definitions

  /** Optional UI rendering info */
  //renderHint?: RenderHint;               // currently not used

  /** Optional finalize mode */
  finalize?: ActionFinalize;             // confirm button rules

  /** game and action specific metadata */
  metadata: Partial<T> = {};

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