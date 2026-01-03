// /shared/models/GameAction.ts
import type { GameState } from "./GameState";
import type { PhaseContext } from "./PhaseContext";

/** Base parameter types that the framework understands */
export type ParamType = "boardSpace" | "gamePiece" | "choice" | "number" | "text";

/** A legal choice for a parameter value */
export interface LegalChoice {
  id: string;
  label?: string;
  displayHint?: {
    hexId?: string;
    pieceId?: string;
  };
  metadata?: Record<string, unknown>;
}

/** Definition of a single action parameter */
export interface ActionParam<T = string> {
  name: string;
  type: ParamType;
  optional?: boolean;
  subtype?: string;
  filter?: Record<string, unknown>;
  dependsOn?: string;
  message?: string;
  value?: T | null;
  choices?: LegalChoice[];
  populateChoices?: (state: GameState, playerId: string) => LegalChoice[];
}

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
  runPhaseStart?: boolean;
}

export interface ActionFinalize {
  mode: "auto" | "confirm";
  label?: string;
  warnings?: string[];
}

export interface IAction<T = Record<string, unknown>> {
  readonly type: string;
  undoable: boolean;
  requireConcurrency?: boolean;
  expectedVersion?: number;
  metadata: Partial<T>;
  executeConsequences?(ctx: PhaseContext, playerId: string): Promise<void>;
}

export abstract class SystemAction<T = Record<string, unknown>> implements IAction<T> {
  readonly type: string;
  undoable = false;
  expectedVersion?: number | undefined;
  metadata: Partial<T> = {};

  constructor(type: string) {
    this.type = type;
  }
}

export abstract class GameAction<T = Record<string, unknown>> implements IAction<T> {
  readonly type: string;
  undoable: boolean;
  expectedVersion?: number;
  requireConcurrency?: boolean;
  undoAction?: GameAction;
  params: ActionParam<any>[] = [];
  finalize?: ActionFinalize;
  metadata: Partial<T> = {};

  constructor(init: {
    type: string;
    undoable: boolean;
    requireConcurrency?: boolean;
    params?: ActionParam<unknown>[];
    finalize?: ActionFinalize;
  }) {
    this.type = init.type;
    this.undoable = init.undoable;
    this.params = init.params ?? [];
    this.finalize = init.finalize;
    this.requireConcurrency = init.requireConcurrency;
  }

  abstract execute(state: GameState, playerId: string): Promise<ActionResponse>;

  executeConsequences(_ctx: PhaseContext, _playerId: string): Promise<void> {
    //does nothing, should be overriden by subclasses
    return Promise.resolve();
  }

  /**
   * Populate choices for all unfilled params whose dependencies are met.
   * Called by framework after params are filled.
   */
  populateParamChoices(state: GameState, playerId: string): void {
    for (const param of this.params) {
      // Skip if already filled
      if (param.value !== undefined && param.value !== null) continue;

      // Skip if depends on unfilled param
      if (param.dependsOn) {
        const dependency = this.params.find((p) => p.name === param.dependsOn);
        if (!dependency || dependency.value === undefined || dependency.value === null) {
          continue;
        }
      }

      // Populate choices if function provided
      if (param.populateChoices) {
        param.choices = param.populateChoices(state, playerId);
      }
    }
  }

  isParamComplete(name: string): boolean {
    return this.params.find((p) => p.name === name)?.value !== undefined;
  }

  allParamsComplete(): boolean {
    return this.params.every((p) => p.optional === false || p.value !== undefined);
  }

  setParamValue(name: string, val: string) {
    const param = this.params.find((p) => p.name === name);
    if (!param) throw new Error(`Unknown param: ${name}`);
    param.value = val;
  }

  getFinalizeInfo(_state: GameState, _playerId: string): ActionFinalize | null {
    return this.finalize ?? null;
  }

  getParamValue(name: string) {
    return this.params.find((p) => p.name === name)?.value;
  }

  getStringParam(name: string) {
    const v = this.getParamValue(name);
    return typeof v === "string" ? v.trim() : undefined;
  }

  get paramMap() {
    return Object.fromEntries(this.params.map((p) => [p.name, p.value]));
  }
}
