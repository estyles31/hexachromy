// /modules/throneworld/functions/phases/EmpirePhase.ts
import { Phase } from "../../../../shared-backend/Phase";
import { PhaseContext } from "../../../../shared/models/PhaseContext";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import { GameAction, ActionResponse, SystemAction } from "../../../../shared/models/GameAction";
import { ResearchAction } from "../actions/ResearchAction";
import { ProductionAction } from "../actions/ProductionAction";
import { PassAction } from "../actions/PassAction";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { getPlayerProductionInfo } from "../../shared/models/Production.Throneworld";

interface EmpirePhaseMetadata {
  playersResearched?: string[];
  playersPassed?: string[];
  productionActions?: Record<string, ProductionAction[]>; // playerId → list of production actions
  treasuryAwarded?: boolean;
}

class EmpireStartAction extends SystemAction {
  constructor() {
    super("empireStart");
  }
}

export class EmpirePhase extends Phase {
  readonly name = "Empire";

  async onPhaseStart(ctx: PhaseContext): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;

    // Award treasury from connected planets (if production turn)
    if (state.state.isProductionTurn) {
      for (const playerId of Object.keys(state.players)) {
        const productionInfo = getPlayerProductionInfo(state, playerId);
        state.players[playerId].resources += productionInfo.treasury;
      }

      // Mark treasury awarded
      if (!state.state.phaseMetadata) state.state.phaseMetadata = {};
      if (!state.state.phaseMetadata.Empire) state.state.phaseMetadata.Empire = {};
      (state.state.phaseMetadata.Empire as EmpirePhaseMetadata).treasuryAwarded = true;
    }

    return {
      action: new EmpireStartAction(),
      success: true,
      message: state.state.isProductionTurn ? "Empire phase - Production turn" : "Empire phase - Non-production turn",
    };
  }

  async getLegalActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const phaseData = state.state.phaseMetadata?.Empire as EmpirePhaseMetadata | undefined;
    const actions: GameAction[] = [];

    // Research first
    const hasResearched = phaseData?.playersResearched?.includes(playerId) ?? false;
    if (!hasResearched) {
      actions.push(new ResearchAction());
      return {
        actions,
        message: "Empire phase - Select technology to research",
      };
    }

    // TODO: Event draw (skip for now)

    // Production (only if production turn)
    if (state.state.isProductionTurn) {
      const hasPassed = phaseData?.playersPassed?.includes(playerId) ?? false;

      if (!hasPassed) {
        actions.push(
          new ProductionAction(),
          new PassAction({ label: "Done with Production", historyMessage: "Finished production" })
        );

        return {
          actions,
          message: "Empire phase - Build units (or pass)",
        };
      }
    }

    // Waiting for others
    return {
      actions: [],
      message: "Waiting for other players...",
    };
  }

  async executePhaseAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    const result = await action.execute(ctx.gameState, playerId);

    // Track production actions for batched execution
    if (result.success && action.type === "production") {
      const state = ctx.gameState as ThroneworldGameState;
      if (!state.state.phaseMetadata) state.state.phaseMetadata = {};
      if (!state.state.phaseMetadata.Empire) state.state.phaseMetadata.Empire = {};
      const empireData = state.state.phaseMetadata.Empire as EmpirePhaseMetadata;
      if (!empireData.productionActions) empireData.productionActions = {};
      if (!empireData.productionActions[playerId]) empireData.productionActions[playerId] = [];
      empireData.productionActions[playerId].push(action as ProductionAction);
    }

    return result;
  }

  async onActionCompleted(ctx: PhaseContext, playerId: string, result: ActionResponse): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const phaseData = state.state.phaseMetadata?.Empire as EmpirePhaseMetadata | undefined;

    // Handle pass - mark player as passed
    if (result.action.type === "pass") {
      if (!state.state.phaseMetadata) state.state.phaseMetadata = {};
      if (!state.state.phaseMetadata.Empire) state.state.phaseMetadata.Empire = {};
      const empireData = state.state.phaseMetadata.Empire as EmpirePhaseMetadata;
      if (!empireData.playersPassed) empireData.playersPassed = [];
      empireData.playersPassed.push(playerId);
    }

    // Check if all players have passed (or if non-production turn, all have researched)
    const allPlayers = Object.keys(state.players);
    const allResearched = allPlayers.every((pid) => phaseData?.playersResearched?.includes(pid) ?? false);

    let allReady = allResearched;
    if (state.state.isProductionTurn) {
      const allPassed = allPlayers.every((pid) => phaseData?.playersPassed?.includes(pid) ?? false);
      allReady = allResearched && allPassed;
    }

    if (allReady) {
      // Execute all production consequences
      if (state.state.isProductionTurn && phaseData?.productionActions) {
        for (const [pid, actions] of Object.entries(phaseData.productionActions)) {
          for (const action of actions) {
            if ("executeConsequences" in action && typeof action.executeConsequences === "function") {
              await action.executeConsequences(ctx, pid);
            }
          }
        }
      }

      // Clear phase metadata
      state.state.phaseMetadata = {};

      // Transition to End phase
      result.phaseTransition = {
        nextPhase: "End",
        transitionType: "nextPhase",
      };
    }

    return result;
  }
}
