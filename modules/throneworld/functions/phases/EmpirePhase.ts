// /modules/throneworld/functions/phases/EmpirePhase.ts
import { Phase, PhaseContext } from "../../../../shared-backend/Phase";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import { GameAction, ActionResponse } from "../../../../shared/models/GameAction";

export class EmpirePhase extends Phase {
  readonly name = "Empire";

  async getLegalActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    return {
      actions: [],
      message: "Empire phase - Research and Production",
    };
  }

  async executePhaseAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    return {
      action,
      success: false,
      error: "Empire actions not yet implemented",
    };
  }
}
