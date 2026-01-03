// /modules/throneworld/functions/phases/OutreachPhase.ts
import { Phase } from "../../../../shared-backend/Phase";
import { PhaseContext } from "../../../../shared/models/PhaseContext";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import { ActionResponse } from "../../../../shared/models/GameAction";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { JumpAction } from "../actions/JumpAction";
import { ProductionAction } from "../actions/ProductionAction";
import { PassAction } from "../actions/PassAction";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import { clearMovedUnits, readyAllBunkers } from "../actions/ActionHelpers";

export class OutreachPhase extends Phase {
  readonly name = "Outreach";

  private hasProductionComplete(state: ThroneworldGameState, playerId: string): boolean {
    return (state.state.phaseMetadata?.productionComplete as Record<string, boolean>)?.[playerId] ?? false;
  }

  private markProductionComplete(state: ThroneworldGameState, playerId: string): void {
    if (!state.state.phaseMetadata) {
      state.state.phaseMetadata = {};
    }
    if (!state.state.phaseMetadata.productionComplete) {
      state.state.phaseMetadata.productionComplete = {};
    }
    (state.state.phaseMetadata.productionComplete as Record<string, boolean>)[playerId] = true;
  }

  private hasPlayerCompletedPhase(state: ThroneworldGameState, playerId: string): boolean {
    const jumpCount = this.countPlayerJumps(state, playerId);
    const productionDone = this.hasProductionComplete(state, playerId);

    return jumpCount >= 2 && productionDone;
  }

  private countPlayerJumps(state: ThroneworldGameState, playerId: string): number {
    let usedBunkers = 0;

    for (const system of Object.values(state.state.systems)) {
      const playerUnits = system.unitsOnPlanet[playerId];
      if (!playerUnits) continue;
      for (const unit of playerUnits) {
        const unitDef = UNITS[unit.unitTypeId];
        if (unitDef?.Command && unit.hasMoved) {
          usedBunkers++;
        }
      }
    }

    return usedBunkers;
  }

  protected async getPhaseSpecificActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    const state = ctx.gameState as ThroneworldGameState;

    const jumpCount = this.countPlayerJumps(state, playerId);
    const jumpsRemaining = 2 - jumpCount;

    // If jumps not complete, only allow jump actions
    if (jumpsRemaining > 0) {
      return {
        actions: [new JumpAction()],
        message: `Outreach phase - ${jumpsRemaining} jump${jumpsRemaining === 1 ? "" : "s"} remaining`,
      };
    }

    // Jumps complete - allow production or pass
    const productionDone = this.hasProductionComplete(state, playerId);

    if (!productionDone) {
      const prodAction = new ProductionAction();
      const hexParam = prodAction.params.find((p) => p.name == "hexId");
      const choices = hexParam?.populateChoices?.(state, playerId);

      //in Outreach, you can only produce at your homeworld
      if (choices?.length === 1) {
        prodAction.setParamValue("hexId", choices[0].id);
      }

      return {
        actions: [prodAction, new PassAction({ label: "Pass Production", historyMessage: "Passed Production" })],
        message: "Outreach phase - Homeworld production (or pass)",
      };
    }

    // Phase complete for this player
    return {
      actions: [],
      message: "Waiting for other players",
    };
  }

  async onActionCompleted(ctx: PhaseContext, playerId: string, result: ActionResponse): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;

    // Execute action consequences immediately
    // Each action knows how to handle its own consequences
    if (result.action.type === "jump" || result.action.type === "scan") {
      if ("executeConsequences" in result.action && typeof result.action.executeConsequences === "function") {
        await (result.action as any).executeConsequences(ctx, playerId);
      }
    } else if (result.action.type === "pass") {
      this.markProductionComplete(state, playerId);
    }

    // Update currentPlayers based on who can still act
    const activePlayers = Object.keys(state.players).filter((pid) => {
      return !this.hasPlayerCompletedPhase(state, pid);
    });

    state.state.currentPlayers = activePlayers.length > 0 ? activePlayers : undefined;

    // If no one can act, advance to next phase
    if (!state.state.currentPlayers) {
      // Clear phase metadata
      state.state.phaseMetadata = {};

      // ready all units
      clearMovedUnits({ state });
      readyAllBunkers({ state });

      result.phaseTransition = {
        nextPhase: "Expansion",
        transitionType: "nextPhase",
      };
    }

    return result;
  }
}
