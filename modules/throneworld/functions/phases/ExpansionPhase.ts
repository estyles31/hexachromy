// /modules/throneworld/functions/phases/ExpansionPhase.ts
import { Phase, PhaseContext } from "../../../../shared-backend/Phase";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import { GameAction, ActionResponse } from "../../../../shared/models/GameAction";

export class ExpansionPhase extends Phase {
  readonly name = "Expansion";

  async getLegalActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    return {
      actions: [],
      message: "Expansion phase - Transfer, Scan/Jump, or play Action Chits",
    };
  }

  async executePhaseAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    return {
      action,
      success: false,
      error: "Expansion actions not yet implemented",
    };
  }
}