// /modules/throneworld/functions/phases/CombatSubPhase.ts
import { Phase } from "../../../../shared-backend/Phase";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import { ActionResponse } from "../../../../shared/models/GameAction";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { PassAction } from "../actions/PassAction";
import { RetreatAction } from "../actions/RetreatAction";
import { DropInvadeAction } from "../actions/DropInvadeAction";
import { CombatRoundAction } from "../actions/CombatRoundAction";
import { CombatMetadata, canRetreat, canDropInvade, isCombatOver } from "../actions/CombatHelpers";
import { PhaseContext } from "../../../../shared/models/PhaseContext";

interface CombatSubPhaseMetadata extends CombatMetadata {
  playersPassed: string[]; // Who has passed this round
}

export class CombatSubPhase extends Phase {
  readonly name = "CombatSubPhase";

  async onPhaseStart(_ctx: PhaseContext): Promise<ActionResponse> {
    // Combat metadata should already be initialized by whoever triggered combat
    return {
      action: new PassAction(),
      success: true,
      message: "Combat initiated",
    };
  }

  async loadPhase(_ctx: PhaseContext): Promise<void> {
    // Metadata already exists, nothing to initialize
  }

  private getMetadata(state: ThroneworldGameState): CombatSubPhaseMetadata {
    return state.state.phaseMetadata as unknown as CombatSubPhaseMetadata;
  }

  protected async getPhaseSpecificActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const metadata = this.getMetadata(state);

    // Check if this player has already passed this round
    if (metadata.playersPassed.includes(playerId)) {
      return {
        actions: [],
        message: "Waiting for other players",
      };
    }

    const actions = [];

    // Space combat actions
    if (metadata.spaceCombatActive) {
      if (canRetreat(metadata, playerId)) {
        actions.push(new RetreatAction());
      }

      if (playerId === metadata.attackerId && canDropInvade(state, metadata)) {
        actions.push(new DropInvadeAction());
      }
    }

    // Always can pass
    actions.push(
      new PassAction({
        label: "Pass (Continue Combat)",
        confirmLabel: "Continue to next round?",
        historyMessage: "Passed",
      })
    );

    const roundType = metadata.spaceCombatActive ? "Space" : "Ground";
    const roundNum = metadata.roundNumber + 1;

    return {
      actions,
      message: `${roundType} Combat - Round ${roundNum}`,
    };
  }

  async onActionCompleted(ctx: PhaseContext, playerId: string, result: ActionResponse): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const metadata = this.getMetadata(state);

    if (result.action.type === "pass") {
      // Mark player as passed
      if (!metadata.playersPassed.includes(playerId)) {
        metadata.playersPassed.push(playerId);
      }

      // Check if all players have passed
      const allPlayersPassed = this.haveAllPlayersPassed(metadata);

      if (allPlayersPassed) {
        // Execute combat round as system action
        const combatRoundAction = new CombatRoundAction();
        const roundResult = await combatRoundAction.execute(state, "system");

        if (!roundResult.success) {
          return roundResult;
        }

        // Clear passed players for next round
        metadata.playersPassed = [];

        // Check if combat is over
        if (isCombatOver(state, metadata)) {
          return this.endCombat(state);
        }
      }
    } else if (result.action.type === "retreat") {
      // Retreat ends combat
      return this.endCombat(state);
    } else if (result.action.type === "dropInvade") {
      // Drop invade doesn't end the round, just marks player as passed
      if (!metadata.playersPassed.includes(playerId)) {
        metadata.playersPassed.push(playerId);
      }

      // Check if all players have passed after drop invade
      const allPlayersPassed = this.haveAllPlayersPassed(metadata);

      if (allPlayersPassed) {
        // Execute combat round
        const combatRoundAction = new CombatRoundAction();
        const roundResult = await combatRoundAction.execute(state, "system");

        if (!roundResult.success) {
          return roundResult;
        }

        metadata.playersPassed = [];

        if (isCombatOver(state, metadata)) {
          return this.endCombat(state);
        }
      }
    }

    return result;
  }

  private haveAllPlayersPassed(metadata: CombatSubPhaseMetadata): boolean {
    const activePlayers = [metadata.attackerId, metadata.defenderId].filter((p) => p !== "neutral");

    // Neutral always auto-passes
    if (metadata.defenderId === "neutral") {
      return metadata.playersPassed.includes(metadata.attackerId);
    }
    if (metadata.attackerId === "neutral") {
      return metadata.playersPassed.includes(metadata.defenderId);
    }

    // Both players must pass
    return activePlayers.every((p) => metadata.playersPassed.includes(p));
  }

  private endCombat(state: ThroneworldGameState): ActionResponse {
    // Restore previous phase
    const previousPhase = (state.state as any).previousPhase;
    const previousPhaseMetadata = (state.state as any).previousPhaseMetadata;

    if (previousPhase) {
      state.state.currentPhase = previousPhase;
      state.state.phaseMetadata = previousPhaseMetadata;
      delete (state.state as any).previousPhase;
      delete (state.state as any).previousPhaseMetadata;
    }

    return {
      action: new PassAction(),
      success: true,
      message: "Combat ended",
      phaseTransition: {
        nextPhase: previousPhase || "Expansion",
        transitionType: "nextPhase",
      },
    };
  }
}
