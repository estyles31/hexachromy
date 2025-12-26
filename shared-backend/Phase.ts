// /shared-backend/Phase.ts
import type { LegalActionsResponse } from "../shared/models/ApiContexts";
import type { ActionResponse, GameAction } from "../shared/models/GameAction";
import type { GameDatabaseAdapter } from "../shared/models/GameDatabaseAdapter";
import type { GameState } from "../shared/models/GameState";
import { createAction } from "./ActionRegistry";

export interface PhaseContext {
  gameState: GameState;
  db: GameDatabaseAdapter;
}

/** Base class for all game phases */
export abstract class Phase {
  abstract readonly name: string;

  /** Called when phase begins - handles automated actions */
  async onPhaseStart?(ctx: PhaseContext): Promise<ActionResponse>;

  /** Called after an action has been completed */
  async onActionCompleted?(ctx: PhaseContext, playerId: string, result: ActionResponse): Promise<ActionResponse>;

  /** check's player's turn - true if currentPlayers is undefined, or if it contains the player's id */
  isItMyTurn(ctx: PhaseContext, playerId: string): boolean {
    const currentPlayers = ctx.gameState.state.currentPlayers ?? [playerId];
    const result = currentPlayers.includes(playerId);
    return result;
  }

  /** Get all legal actions for a specific player in this phase */
  async getLegalActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    const phaseActions = await this.getPhaseSpecificActions(ctx, playerId);

    return {
      actions: [...phaseActions.actions],
      message: phaseActions.message,
    };
  }

  /** Get phase-specific legal actions (override in subclasses) */
  protected async getPhaseSpecificActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    return {
      actions: [],
      message: `${this.name} phase`,
    };
  }

  /** Validate and execute an action */
  async executeAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    return this.executePhaseAction(ctx, playerId, action);
  }

  createAction(type: string): GameAction | null {
    return createAction(type);
  }

  /**
   * BASE VALIDATION
   * 1. If the phase assigns a current player, enforce turn order.
   * 2. Check if the action matches the allowed list.
   *
   * Subclasses may override and call super.validateAction() first.
   */
  async validateAction(
    ctx: PhaseContext,
    playerId: string,
    action: GameAction
  ): Promise<{ success: boolean; error?: string }> {

    if(!this.isItMyTurn(ctx, playerId)) {
      return {
        success: false,
        error: "it's not your turn"
      };
    }

    // 2️⃣ Check legal action type list
    const legal = await this.getLegalActions(ctx, playerId);

    if (!legal.actions.map((l) => l.type).includes(action.type)) {
      return {
        success: false,
        error: `action not allowed in this phase: ${action.type}`
      };
    }

    return { success: true };
  }

  /**
   * Execute phase-specific actions (override in subclasses)
   */
  protected async executePhaseAction(_ctx: PhaseContext, _playerId: string, action: GameAction): Promise<ActionResponse> {
    return {
      action,
      success: false,
      error: `${this.name} actions not yet implemented`,
    };
  }

  /**
   * Apply an undo action
   */
  async applyUndo(_ctx: PhaseContext, _playerId: string, undoAction: GameAction): Promise<ActionResponse> {
    return {
      action: undoAction,
      success: false,
      error: "Undo not implemented for this phase",
    };
  }
}