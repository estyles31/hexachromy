// /modules/throneworld/functions/phases/OutreachPhase.ts
import { Phase, PhaseContext } from "../../../../shared-backend/Phase";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import type { ActionResponse } from "../../../../shared/models/GameAction";
import { ScanAction } from "../actions/ScanAction";
import { JumpAction } from "../actions/JumpAction";
import { revealSystemToPlayer } from "../actions/ActionHelpers";
import { resolveHexCombat } from "../actions/CombatHelpers";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";

export class OutreachPhase extends Phase {
  readonly name = "Outreach";

  async loadPhase(ctx: PhaseContext): Promise<void> {
    const state = ctx.gameState as ThroneworldGameState;

    // Set currentPlayers to all players who haven't taken 2 actions yet
    const activePlayers = Object.keys(state.players).filter(playerId => {
      const actionCount = this.countPlayerActionsThisPhase(state, playerId);
      return actionCount < 2;
    });

    state.state.currentPlayers = activePlayers.length > 0 ? activePlayers : undefined;
  }

  private countPlayerActionsThisPhase(state: ThroneworldGameState, playerId: string): number {
    // Count bunkers that have hasMoved = true
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
    
    const actionCount = this.countPlayerActionsThisPhase(state, playerId);
    const actionsRemaining = 2 - actionCount;

    if (actionsRemaining <= 0) {
      return {
        actions: [],
        message: "Waiting for other players"
      };
    }

    return {
      actions: [
        new ScanAction(),
        new JumpAction()
      ],
      message: `Outreach phase - ${actionsRemaining} action${actionsRemaining === 1 ? '' : 's'} remaining`
    };
  }

  async onActionCompleted(ctx: PhaseContext, playerId: string, result: ActionResponse)
    : Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;

    // Handle action-specific logic
    if (result.action.type === "scan") {
      await this.handleScanCompleted(ctx, playerId, result);
    } else if (result.action.type === "jump") {
      await this.handleJumpCompleted(ctx, playerId, result);
    }

    // Update currentPlayers based on who can still act
    const activePlayers = Object.keys(state.players).filter(pid => {
      const actionCount = this.countPlayerActionsThisPhase(state, pid);
      return actionCount < 2;
    });

    state.state.currentPlayers = activePlayers.length > 0 ? activePlayers : undefined;

    // If no one can act, advance to next phase
    if (!state.state.currentPlayers) {
      result.phaseTransition = {
        nextPhase: "Expansion",
        transitionType: "nextPhase"
      };
    }

    return result;
  }

  private async handleScanCompleted(ctx: PhaseContext, playerId: string, result: ActionResponse)
    : Promise<void> {
    const action = result.action as ScanAction;
    const targetHexId = action.metadata.targetHexId;
    
    if (!targetHexId || !action.metadata.didScan) return;
    
    // Scans reveal immediately (no combat)
    await revealSystemToPlayer(ctx, playerId, targetHexId);
  }

  private async handleJumpCompleted(
    ctx: PhaseContext,
    playerId: string,
    result: ActionResponse
  ): Promise<void> {
    const action = result.action as JumpAction;
    const targetHexId = action.metadata.targetHexId;
    
    if (!targetHexId) return;
    
    // Check for combat
    await resolveHexCombat(ctx, playerId, targetHexId);
    
    // After combat, reveal if scanned (survey team must have survived)
    if (action.metadata.didScan) {
      await revealSystemToPlayer(ctx, playerId, targetHexId);
    }
  }
}