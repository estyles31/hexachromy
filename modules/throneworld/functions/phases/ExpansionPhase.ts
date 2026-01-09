// /modules/throneworld/functions/phases/ExpansionPhase.ts
import { Phase } from "../../../../shared-backend/Phase";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import { GameAction, ActionResponse } from "../../../../shared/models/GameAction";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { JumpAction } from "../actions/JumpAction";
import { ScanAction } from "../actions/ScanAction";
import { PassAction } from "../actions/PassAction";
import { TransferAction } from "../actions/TransferAction";
import { getActionFromJson } from "../../../../shared-backend/ActionRegistry";
import {
  CombatMetadata,
  findAllCombatHexes,
  initiateCombat,
  transitionToCombatSubPhase,
} from "../actions/CombatHelpers";
import { PhaseContext } from "../../../../shared/models/PhaseContext";
import { ReorganizeAction } from "../actions/ReorganizeAction";

export interface ExpansionPhaseMetadata extends Record<string, unknown> {
  currentPlayerIndex: number;
  pendingConsequences: Array<{
    playerId: string;
    actionData: any; // Serialized action
  }>;
  playerChoices: Record<string, "transfer" | "scan_jump">;
  actionsUsed: Record<string, number>;

  // Track jump metadata for combat
  jumpMetadata: Record<
    string,
    {
      // keyed by hexId
      inCommRange: boolean;
      sourceHexId: string;
    }
  >;

  activeCombat?: CombatMetadata;
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
      jumpMetadata: {},
    };

    state.state.phaseMetadata = metadata;

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

    if (!state.state.phaseMetadata) {
      const metadata: ExpansionPhaseMetadata = {
        currentPlayerIndex: 0,
        pendingConsequences: [],
        playerChoices: {},
        actionsUsed: {},
        jumpMetadata: {},
      };

      state.state.phaseMetadata = metadata;

      const firstPlayer = state.playerOrder[0];
      state.state.currentPlayers = [firstPlayer];
    }
  }

  async executeAction(ctx: PhaseContext, action: GameAction, playerId: string): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;

    // Scan/Jump actions execute immediately (movement), consequences deferred
    if (action.type === "scan" || action.type === "jump") {
      if (!action.allParamsComplete()) {
        return { action, success: false, error: "missing_parameters" };
      }
    }

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

    if (playerId !== currentPlayer) {
      return {
        actions: [],
        message: "Waiting for your turn",
      };
    }

    const playerChoice = metadata.playerChoices[playerId];

    if (!playerChoice) {
      return {
        actions: [
          new TransferAction(),
          new ScanAction(),
          new JumpAction(),
          new ReorganizeAction(),
          new PassAction({
            label: "Pass Movement",
            confirmLabel: "Pass without moving anything?",
            historyMessage: "Passed Movement",
          }),
        ],
        message: "Expansion phase - Transfer OR up to 3 Scan/Jump actions",
      };
    }

    if (playerChoice === "scan_jump") {
      const actionsUsed = metadata.actionsUsed[playerId] || 0;

      if (actionsUsed >= 3) {
        return {
          actions: [
            new PassAction({
              label: "Pass (Execute Actions)",
              confirmLabel: "Execute queued actions?",
              historyMessage: "Executed Actions",
            }),
          ],
          message: "All 3 actions used - Pass to execute",
        };
      }

      return {
        actions: [
          new ScanAction(),
          new JumpAction(),
          new ReorganizeAction(),
          new PassAction({
            label: "Pass (Execute Actions)",
            confirmLabel: "Execute queued actions?",
            historyMessage: "Executed Actions",
          }),
        ],
        message: `Expansion phase - ${3 - actionsUsed} action${3 - actionsUsed === 1 ? "" : "s"} remaining`,
      };
    }

    return {
      actions: [],
      message: "Waiting for other players",
    };
  }

  async onActionCompleted(ctx: PhaseContext, playerId: string, result: ActionResponse): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const metadata = this.getMetadata(state);

    if (result.action.type === "transfer") {
      metadata.playerChoices[playerId] = "transfer";
      this.moveToNextPlayer(state);
    } else if (result.action.type === "scan" || result.action.type === "jump") {
      metadata.playerChoices[playerId] = "scan_jump";
      metadata.actionsUsed[playerId] = (metadata.actionsUsed[playerId] || 0) + 1;

      // Store serialized action for consequence execution
      metadata.pendingConsequences.push({
        playerId,
        actionData: JSON.parse(JSON.stringify(result.action)),
      });

      // Track jump metadata for combat
      if (result.action.type === "jump") {
        const jumpAction = result.action as JumpAction;
        const targetHexId = jumpAction.metadata.targetHexId;
        const sourceHexId = jumpAction.metadata.sourceHexId;

        if (targetHexId) {
          metadata.jumpMetadata[targetHexId] = {
            inCommRange: jumpAction.metadata.commSupport ?? false,
            sourceHexId: sourceHexId || targetHexId, // Fallback to target if source missing
          };
        }
      }
    } else if (result.action.type === "pass") {
      // Execute all pending consequences for this player
      await this.executePendingConsequences(ctx, playerId);

      // Check for combat after consequences execute
      const combatResult = this.checkForCombatAndTransition(state, playerId);
      if (combatResult.phaseTransition) {
        return combatResult; // Transition to combat
      }

      this.moveToNextPlayer(state);
    }

    // Check if phase is complete
    if (!state.state.currentPlayers) {
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

    for (const pending of playerConsequences) {
      const action = getActionFromJson(pending.actionData);

      // Execute consequences (combat, scans, reveals)
      if (action.executeConsequences) {
        await action.executeConsequences(ctx, playerId);
      }
    }

    // Remove executed consequences
    metadata.pendingConsequences = metadata.pendingConsequences.filter((pc) => pc.playerId !== playerId);
  }

  private checkForCombatAndTransition(state: ThroneworldGameState, actingPlayerId: string): ActionResponse {
    const metadata = this.getMetadata(state);
    const combatInfos = findAllCombatHexes(state, actingPlayerId);

    if (combatInfos.length > 0) {
      // Take first combat (already randomized)
      const combatInfo = combatInfos[0];

      // Get jump metadata for this hex
      const jumpMeta = metadata.jumpMetadata[combatInfo.hexId];

      const combat = initiateCombat(
        state,
        combatInfo.hexId,
        combatInfo.attackerId,
        combatInfo.defenderId,
        actingPlayerId,
        jumpMeta?.inCommRange ?? false,
        jumpMeta?.sourceHexId
      );

      if (combat) {
        return transitionToCombatSubPhase(state, combat);
      }
    }

    // No combat found
    return {
      action: new PassAction(),
      success: true,
      message: "No combat",
    };
  }
}
