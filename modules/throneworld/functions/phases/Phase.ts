// /modules/throneworld/functions/phases/Phase.ts
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type { GameAction, LegalActionsResponse, ActionResponse } from "../../../../shared/models/ApiContexts";
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
   * Returns events/animations that should be displayed
   */
  async onPhaseStart?(ctx: PhaseContext): Promise<void>;

  /**
   * Get all legal actions for a specific player in this phase
   * Override this to add phase-specific actions
   */
  async getLegalActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    // Base implementation: chat is always legal
    const chatAction: GameAction = {
      type: "chat",
      undoable: true,
      message: "",  // Player will fill this in
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
   * Validate and execute an action
   * Handles chat automatically, delegates to executePhaseAction for game actions
   */
  async executeAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    // Handle chat action
    if (action.type === "chat") {
      return this.handleChatAction(ctx, playerId, action);
    }

    // Delegate to phase-specific action handler
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
   * Handle chat action (common to all phases)
   */
  private async handleChatAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    const message = action.message as string;
    
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return {
        success: false,
        error: "Message cannot be empty",
      };
    }

    if (message.length > 500) {
      return {
        success: false,
        error: "Message too long (max 500 characters)",
      };
    }

    // Chat action succeeds immediately - no state changes needed
    // The action itself being in the ActionLog is the record
    const undoAction: GameAction = {
      type: "unchat",
      undoable: false,  // Unchat is not itself undoable
    };

    return {
      success: true,
      stateChanges: ctx.gameState,  // No changes to game state
      undoAction,
    };
  }

  /**
   * Apply an undo action directly without recording it in action history
   * Default implementation: just execute the undo action normally
   * Override this if your phase needs special undo handling
   */
  async applyUndo(ctx: PhaseContext, playerId: string, undoAction: GameAction): Promise<ActionResponse> {
    // For unchat, just succeed without doing anything
    if (undoAction.type === "unchat") {
      return {
        success: true,
        stateChanges: ctx.gameState,  // No changes needed
      };
    }

    return this.executeAction(ctx, playerId, undoAction);
  }

  /**
   * Get a message envelope for the current player (instructions, status, etc.)
   */
  async getMessageEnvelope?(ctx: PhaseContext, playerId: string): Promise<string>;
}
