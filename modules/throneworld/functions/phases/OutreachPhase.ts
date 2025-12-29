// /modules/throneworld/functions/phases/OutreachPhase.ts
import { Phase, PhaseContext } from "../../../../shared-backend/Phase";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import type { ActionResponse } from "../../../../shared/models/GameAction";
import { JumpAction } from "../actions/JumpAction";
import { PassAction } from "../actions/PassAction";
import { revealSystemToPlayer } from "../actions/ActionHelpers";
import { resolveHexCombat } from "../actions/CombatHelpers";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import { ProductionAction } from "../actions/ProductionAction";

export class OutreachPhase extends Phase {
  readonly name = "Outreach";

  async loadPhase(ctx: PhaseContext): Promise<void> {
    const state = ctx.gameState as ThroneworldGameState;

    // Initialize phase metadata if needed
    if (!state.state.phaseMetadata) {
      state.state.phaseMetadata = {};
    }

    // Set currentPlayers to all players who haven't completed the phase
    const activePlayers = Object.keys(state.players).filter(playerId => {
      return !this.hasPlayerCompletedPhase(state, playerId);
    });

    state.state.currentPlayers = activePlayers.length > 0 ? activePlayers : undefined;
  }

  private hasProductionComplete(state: ThroneworldGameState, playerId: string): boolean {
    return (state.state.phaseMetadata?.productionComplete as Record<string, boolean>)?.[playerId] ?? false;
  }

  private markProductionComplete(state: ThroneworldGameState, playerId: string): void {
    if (!state.state.phaseMetadata) { state.state.phaseMetadata = {}; }
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

  protected async getPhaseSpecificActions(
    ctx: PhaseContext,
    playerId: string
  ): Promise<LegalActionsResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    
    const jumpCount = this.countPlayerJumps(state, playerId);
    const jumpsRemaining = 2 - jumpCount;

    // If jumps not complete, only allow jump actions
    if (jumpsRemaining > 0) {
      return {
        actions: [new JumpAction()],
        message: `Outreach phase - ${jumpsRemaining} jump${jumpsRemaining === 1 ? '' : 's'} remaining`
      };
    }

    // Jumps complete - allow production or pass
    const productionDone = this.hasProductionComplete(state, playerId);
    
    if (!productionDone) {
      return {
        actions: [
          new ProductionAction(),
          new PassAction()
        ],
        message: "Outreach phase - Homeworld production (or pass)"
      };
    }

    // Phase complete for this player
    return {
      actions: [],
      message: "Waiting for other players"
    };
  }

  async onActionCompleted(ctx: PhaseContext, playerId: string, result: ActionResponse)
    : Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;

    // Handle action-specific logic
    if (result.action.type === "jump") {
      await this.handleJumpCompleted(ctx, playerId, result);
    } else if (result.action.type === "pass") {
      // Mark production as complete in phase metadata
      this.markProductionComplete(state, playerId);
    }

    // Update currentPlayers based on who can still act
    const activePlayers = Object.keys(state.players).filter(pid => {
      return !this.hasPlayerCompletedPhase(state, pid);
    });

    state.state.currentPlayers = activePlayers.length > 0 ? activePlayers : undefined;

    // If no one can act, advance to next phase
    if (!state.state.currentPlayers) {
      // Clear phase metadata when transitioning
      state.state.phaseMetadata = {};
      
      result.phaseTransition = {
        nextPhase: "Expansion",
        transitionType: "nextPhase"
      };
    }

    return result;
  }

  private async handleJumpCompleted(
    ctx: PhaseContext,
    playerId: string,
    result: ActionResponse
  ): Promise<void> {
    const action = result.action as JumpAction;
    const targetHexId = action.metadata.targetHexId;
    
    if (!targetHexId) return;
    
    // Check for combat - can't actually happen during Outreach, but leave it here so we remember to do this in Expansion phase
    await resolveHexCombat(ctx, playerId, targetHexId);
    
    // After combat, reveal if scanned (survey team must have survived)
    if (action.metadata.didScan) {
      await revealSystemToPlayer(ctx, playerId, targetHexId);
    }
  }
}