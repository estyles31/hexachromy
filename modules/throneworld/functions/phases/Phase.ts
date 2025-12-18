// /modules/throneworld/functions/phases/Phase.ts
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type { LegalActionsResponse, ActionResponse } from "../../../../shared/models/ApiContexts";
import type { GameAction, ParamChoicesResponse } from "../../../../shared/models/ActionParams";
import type { GameDatabaseAdapter } from "../../../../shared/models/GameDatabaseAdapter";

export interface PhaseContext {
  gameState: ThroneworldGameState;
  db: GameDatabaseAdapter;
}

/**
 * Base class for all game phases
 */
export abstract class Phase {
  abstract readonly name: string;

  /**
   * Called when phase begins - handles automated actions
   */
  async onPhaseStart?(ctx: PhaseContext): Promise<void>;

  /**
   * Get all legal actions for a specific player in this phase
   */
  async getLegalActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    const chatAction: GameAction = {
      type: "chat",
      undoable: true,
      message: "",
      params: [],
      renderHint: {
        category: "custom",
      }
    };

    const phaseActions = await this.getPhaseSpecificActions(ctx, playerId);

    return {
      actions: [chatAction, ...phaseActions.actions],
      message: phaseActions.message,
    };
  }

  /**
   * Get phase-specific legal actions (override in subclasses)
   */
  protected async getPhaseSpecificActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    return {
      actions: [],
      message: `${this.name} phase`,
    };
  }

  /**
   * Get legal choices for an action parameter.
   * Override in subclasses that have parameterized actions.
   */
  async getParamChoices(
    ctx: PhaseContext,
    playerId: string,
    actionType: string,
    paramName: string,
    filledParams: Record<string, string>
  ): Promise<ParamChoicesResponse> {
    return {
      choices: [],
      error: "Parameter choices not supported in this phase",
    };
  }

  /**
   * Validate and execute an action
   */
  async executeAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    if (action.type === "chat") {
      return this.handleChatAction(ctx, playerId, action);
    }
    return this.executePhaseAction(ctx, playerId, action);
  }

  /**
   * Execute phase-specific actions (override in subclasses)
   */
  protected async executePhaseAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    return {
      success: false,
      error: `${this.name} actions not yet implemented`,
    };
  }

  /**
   * Handle chat action
   */
  protected handleChatAction(ctx: PhaseContext, playerId: string, action: GameAction): ActionResponse {
    const state = ctx.gameState;
    
    // if (!state.chatLog) {
    //   state.chatLog = [];
    // }
    
    // state.chatLog.push({
    //   playerId,
    //   message: action.message as string,
    //   timestamp: Date.now(),
    // });

    return {
      success: true,
      stateChanges: state,
    };
  }

  /**
   * Apply an undo action
   */
  async applyUndo(ctx: PhaseContext, playerId: string, undoAction: GameAction): Promise<ActionResponse> {
    return {
      success: false,
      error: "Undo not implemented for this phase",
    };
  }
}
