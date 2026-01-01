// /modules/throneworld/functions/phases/ExpansionPhase.ts
import { Phase, PhaseContext } from "../../../../shared-backend/Phase";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import { GameAction, ActionResponse } from "../../../../shared/models/GameAction";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { JumpAction } from "../actions/JumpAction";
import { ScanAction } from "../actions/ScanAction";
import { PassAction } from "../actions/PassAction";
import { TransferAction } from "../actions/TransferAction";
import { revealSystemToPlayer } from "../actions/ActionHelpers";
import { resolveHexCombat } from "../actions/CombatHelpers";

interface ExpansionPhaseMetadata extends Record<string, unknown> {
  currentPlayerIndex: number;
  pendingActions: Array<{
    playerId: string;
    actionType: string;
    actionData: any; // Serialized action state
  }>;
  playerChoices: Record<string, "transfer" | "scan_jump">;
  actionsUsed: Record<string, number>;
  executingPendingActions?: boolean;
}

export class ExpansionPhase extends Phase {
  readonly name = "Expansion";

  async onPhaseStart(ctx: PhaseContext): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;

    // Initialize metadata
    const metadata: ExpansionPhaseMetadata = {
      currentPlayerIndex: 0,
      pendingActions: [],
      playerChoices: {},
      actionsUsed: {}
    };

    state.state.phaseMetadata = metadata;

    // Set current player to first in order
    const firstPlayer = state.playerOrder[0];
    state.state.currentPlayers = [firstPlayer];

    return {
      action: new PassAction(), // Dummy action for phase start
      success: true,
      message: "Expansion phase started"
    };
  }

  async loadPhase(ctx: PhaseContext): Promise<void> {
    const state = ctx.gameState as ThroneworldGameState;

    // Only initialize if metadata doesn't exist
    if (!state.state.phaseMetadata) {
      const metadata: ExpansionPhaseMetadata = {
        currentPlayerIndex: 0,
        pendingActions: [],
        playerChoices: {},
        actionsUsed: {}
      };

      state.state.phaseMetadata = metadata;

      // Set current player to first in order
      const firstPlayer = state.playerOrder[0];
      state.state.currentPlayers = [firstPlayer];
    }
  }

  async executeAction(ctx: PhaseContext, action: GameAction, playerId: string): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const metadata = this.getMetadata(state);

    // Defer Scan/Jump actions unless we're executing pending actions
    if ((action.type === "scan" || action.type === "jump") && !metadata.executingPendingActions) {
      // Validate that params are complete
      if (!action.allParamsComplete()) {
        return { action, success: false, error: "missing_parameters" };
      }

      // Store minimal metadata - the full action will be stored in pendingActions
      if (action.type === "jump") {
        const jumpAction = action as JumpAction;
        jumpAction.metadata.targetHexId = jumpAction.getStringParam("targetHexId");
      } else if (action.type === "scan") {
        const scanAction = action as ScanAction;
        scanAction.metadata.targetHexId = scanAction.getStringParam("targetHexId");
      }

      return { action, success: true, message: "Queued for execution", undoable: false };
    }

    // Normal execution for all other actions (including deferred execution of pending)
    return action.execute(state, playerId);
  }

  private getMetadata(state: ThroneworldGameState): ExpansionPhaseMetadata {
    return state.state.phaseMetadata as ExpansionPhaseMetadata;
  }

  private getCurrentPlayer(state: ThroneworldGameState): string {
    const metadata = this.getMetadata(state);
    return state.playerOrder[metadata.currentPlayerIndex];
  }

  private moveToNextPlayer(state: ThroneworldGameState): void {
    const metadata = this.getMetadata(state);
    metadata.currentPlayerIndex++;

    if (metadata.currentPlayerIndex >= state.playerOrder.length) {
      // All players done
      state.state.currentPlayers = undefined;
    } else {
      const nextPlayer = state.playerOrder[metadata.currentPlayerIndex];
      state.state.currentPlayers = [nextPlayer];
    }
  }

  protected async getPhaseSpecificActions(
    ctx: PhaseContext,
    playerId: string
  ): Promise<LegalActionsResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const metadata = this.getMetadata(state);
    const currentPlayer = this.getCurrentPlayer(state);

    // Only current player can act
    if (playerId !== currentPlayer) {
      return {
        actions: [],
        message: "Waiting for your turn"
      };
    }

    const playerChoice = metadata.playerChoices[playerId];

    // Player hasn't chosen Transfer vs Scan/Jump yet
    if (!playerChoice) {
      return {
        actions: [
          new TransferAction(),
          new ScanAction(),
          new JumpAction(),
          new PassAction("Pass (End Movement)"),
        ],
        message: "Expansion phase - Transfer OR up to 3 Scan/Jump actions"
      };
    }

    // Player chose Scan/Jump
    if (playerChoice === "scan_jump") {
      const actionsUsed = metadata.actionsUsed[playerId] || 0;

      if (actionsUsed >= 3) {
        return {
          actions: [new PassAction("Pass (End Movement)")],
          message: "All 3 actions used - Pass to execute"
        };
      }

      return {
        actions: [
          new ScanAction(),
          new JumpAction(),
          new PassAction("Pass (End Movement)")
        ],
        message: `Expansion phase - ${3 - actionsUsed} action${3 - actionsUsed === 1 ? '' : 's'} remaining (or Pass to execute)`
      };
    }

    // Player chose Transfer - shouldn't get here as they advance immediately
    return {
      actions: [],
      message: "Waiting for other players"
    };
  }

  async onActionCompleted(ctx: PhaseContext, playerId: string, result: ActionResponse)
    : Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const metadata = this.getMetadata(state);

    if (result.action.type === "transfer") {
      // Transfer executes immediately, move to next player
      metadata.playerChoices[playerId] = "transfer";
      this.moveToNextPlayer(state);

    } else if (result.action.type === "scan" || result.action.type === "jump") {
      // Queue action for deferred execution
      metadata.playerChoices[playerId] = "scan_jump";
      metadata.actionsUsed[playerId] = (metadata.actionsUsed[playerId] || 0) + 1;

      metadata.pendingActions.push({
        playerId,
        actionType: result.action.type,
        actionData: result.action // Store the entire action
      });

    } else if (result.action.type === "pass") {
      // Execute all pending actions for this player
      await this.executePendingActions(ctx, playerId);
      this.moveToNextPlayer(state);
    }

    // Check if phase is complete
    if (!state.state.currentPlayers) {
      // Clear metadata and advance to Empire phase
      state.state.phaseMetadata = {};
      result.phaseTransition = {
        nextPhase: "Empire",
        transitionType: "nextPhase"
      };
    }

    return result;
  }

  private async executePendingActions(ctx: PhaseContext, playerId: string): Promise<void> {
    const state = ctx.gameState as ThroneworldGameState;
    const metadata = this.getMetadata(state);

    const playerActions = metadata.pendingActions.filter(pa => pa.playerId === playerId);

    // Set flag to allow actual execution
    metadata.executingPendingActions = true;

    try {
      for (const pending of playerActions) {
        const action = pending.actionData as GameAction;

        if (action.type === "jump") {
          const jumpAction = action as JumpAction;
          const targetHexId = jumpAction.metadata.targetHexId;

          if (targetHexId) {
            // Resolve combat first
            await resolveHexCombat(ctx, playerId, targetHexId);

            // Then reveal if scanned (survey team must survive)
            if (jumpAction.metadata.didScan) {
              await revealSystemToPlayer(ctx, playerId, targetHexId);
            }
          }
        } else if (action.type === "scan") {
          const scanAction = action as ScanAction;
          const targetHexId = scanAction.metadata.targetHexId;

          if (targetHexId) {
            await revealSystemToPlayer(ctx, playerId, targetHexId);
          }
        }
      }
    } finally {
      // Always clear flag, even if execution fails
      metadata.executingPendingActions = false;
    }

    // Remove executed actions from pending queue
    metadata.pendingActions = metadata.pendingActions.filter(pa => pa.playerId !== playerId);
  }
}