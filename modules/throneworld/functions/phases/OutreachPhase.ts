// /modules/throneworld/functions/phases/OutreachPhase.ts
import { Phase, PhaseContext } from "../../../../shared-backend/Phase";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import type { ActionResponse } from "../../../../shared/models/GameAction";
import { ScanAction } from "../actions/ScanAction";
import { JumpAction } from "../actions/JumpAction";
import { revealSystemToPlayer } from "../actions/ActionHelpers";
import { resolveHexCombat } from "../actions/CombatHelpers";

export class OutreachPhase extends Phase {
  readonly name = "Outreach";

  protected async getPhaseSpecificActions(
    ctx: PhaseContext,
    playerId: string
  ): Promise<LegalActionsResponse> {
    return {
      actions: [
        new ScanAction(),
        new JumpAction()
      ],
      message: "Outreach phase - Scan or Jump"
    };
  }

  async onActionCompleted(ctx: PhaseContext, playerId: string, result: ActionResponse)
    : Promise<ActionResponse> {
      if (process.env.DEBUG === "true") {
         console.log("action completed:", result.action);
      }

    if (result.action.type === "scan") {
      await this.handleScanCompleted(ctx, playerId, result);
    } else if (result.action.type === "jump") {
      await this.handleJumpCompleted(ctx, playerId, result);
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