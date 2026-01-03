// /modules/throneworld/functions/phases/ExpansionPhase.ts
import { Phase } from "../../../../shared-backend/Phase";
import { PhaseContext } from "../../../../shared/models/PhaseContext";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import { ActionResponse } from "../../../../shared/models/GameAction";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { JumpAction } from "../actions/JumpAction";
import { ScanAction } from "../actions/ScanAction";
import { PassAction } from "../actions/PassAction";
import { TransferAction } from "../actions/TransferAction";
import { getActionFromJson } from "../../../../shared-backend/ActionRegistry";

interface PendingConsequence {
  playerId: string;
  actionData: any; // Serialized action as plain JSON
}

interface ExpansionPhaseMetadata extends Record<string, unknown> {
  currentPlayerIndex: number;
  pendingConsequences: PendingConsequence[];
  playerChoices: Record<string, "transfer" | "scan_jump">;
  actionsUsed: Record<string, number>;
}

export class ExpansionPhase extends Phase {
  readonly name = "Expansion";

  async onPhaseStart(ctx: PhaseContext): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;

    // Initialize metadata
    const metadata: ExpansionPhaseMetadata = {
      currentPlayerIndex: 0,
      pendingConsequences: [],
      playerChoices: {},
      actionsUsed: {},
    };

    state.state.phaseMetadata = metadata;

    // Set current player to first in order
    const firstPlayer = state.playerOrder[0];
    state.state.currentPlayers = [firstPlayer];

    return {
      action: new PassAction(),
      success: true,
      message: "Expansion phase started",
    };
  }

  async loadPhase(ctx: PhaseContext): Promise<void> {
    const state = ctx.gameState as ThroneworldGameState;

    // Only initialize if metadata doesn't exist
    if (!state.state.phaseMetadata) {
      const metadata: ExpansionPhaseMetadata = {
        currentPlayerIndex: 0,
        pendingConsequences: [],
        playerChoices: {},
        actionsUsed: {},
      };

      state.state.phaseMetadata = metadata;

      // Set current player to first in order
      const firstPlayer = state.playerOrder[0];
      state.state.currentPlayers = [firstPlayer];
    }
  }

  // REMOVED executeAction override - let actions execute normally
  // Movement happens immediately, consequences deferred in onActionCompleted

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

  protected async getPhaseSpecificActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const metadata = this.getMetadata(state);
    const currentPlayer = this.getCurrentPlayer(state);

    // Only current player can act
    if (playerId !== currentPlayer) {
      return {
        actions: [],
        message: "Waiting for your turn",
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
          new PassAction({
            label: "Pass Movement",
            confirmLabel: "Pass without moving anything?",
            historyMessage: "Passed Movement",
          }),
        ],
        message: "Expansion phase - Transfer OR up to 3 Scan/Jump actions",
      };
    }

    // Player chose Scan/Jump
    if (playerChoice === "scan_jump") {
      const actionsUsed = metadata.actionsUsed[playerId] || 0;

      if (actionsUsed >= 3) {
        return {
          actions: [
            new PassAction({
              label: "Pass (End Movement)",
              confirmLabel: "End Movement",
              historyMessage: "Completed Movement",
            }),
          ],
          message: "All 3 actions used - Pass to execute",
        };
      }

      return {
        actions: [
          new ScanAction(),
          new JumpAction(),
          new PassAction({
            label: "Pass (End Movement)",
            confirmLabel: "End Movement",
            historyMessage: "Completed Movement",
          }),
        ],
        message: `Expansion phase - ${3 - actionsUsed} action${3 - actionsUsed === 1 ? "" : "s"} remaining (or Pass to execute)`,
      };
    }

    // Player chose Transfer - shouldn't get here as they advance immediately
    return {
      actions: [],
      message: "Waiting for other players",
    };
  }

  async onActionCompleted(ctx: PhaseContext, playerId: string, result: ActionResponse): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const metadata = this.getMetadata(state);

    if (result.action.type === "transfer") {
      // Transfer executes immediately, move to next player
      metadata.playerChoices[playerId] = "transfer";
      this.moveToNextPlayer(state);
    } else if (result.action.type === "scan" || result.action.type === "jump") {
      // Action already executed (movement happened)
      // Serialize action to plain JSON for Firestore storage
      metadata.playerChoices[playerId] = "scan_jump";
      metadata.actionsUsed[playerId] = (metadata.actionsUsed[playerId] || 0) + 1;

      metadata.pendingConsequences.push({
        playerId,
        actionData: JSON.parse(JSON.stringify(result.action)), // Serialize to plain JSON
      });
    } else if (result.action.type === "pass") {
      await this.executePendingConsequences(ctx, playerId);
      this.moveToNextPlayer(state);
    }

    // Check if phase is complete
    if (!state.state.currentPlayers) {
      // Clear metadata and advance to Empire phase
      state.state.phaseMetadata = {};
      result.phaseTransition = {
        nextPhase: "Empire",
        transitionType: "nextPhase",
      };
    }

    return result;
  }

  private async executePendingConsequences(ctx: PhaseContext, playerId: string): Promise<void> {
    const state = ctx.gameState as ThroneworldGameState;
    const metadata = this.getMetadata(state);

    const playerConsequences = metadata.pendingConsequences.filter((pc) => pc.playerId === playerId);

    // Execute consequences in order
    for (const pending of playerConsequences) {
      // Reconstruct action from plain JSON
      const action = getActionFromJson(pending.actionData);

      // Let the action handle its own consequences
      await action.executeConsequences(ctx, playerId);
    }

    // Remove executed consequences
    metadata.pendingConsequences = metadata.pendingConsequences.filter((pc) => pc.playerId !== playerId);
  }
}
