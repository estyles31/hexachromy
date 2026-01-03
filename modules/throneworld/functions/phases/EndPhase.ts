// /modules/throneworld/functions/phases/EndPhase.ts
import { Phase } from "../../../../shared-backend/Phase";
import { PhaseContext } from "../../../../shared/models/PhaseContext";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import { GameAction, ActionResponse } from "../../../../shared/models/GameAction";

export class EndPhase extends Phase {
  readonly name = "End";

  async getLegalActions(_ctx: PhaseContext, _playerId: string): Promise<LegalActionsResponse> {
    return {
      actions: [],
      message: "End phase - Ready Command Bunkers and determine player order",
    };
  }

  async executePhaseAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    return {
      action,
      success: false,
      error: "End phase actions not yet implemented",
    };
  }
}
