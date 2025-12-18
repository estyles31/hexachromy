// /modules/throneworld/functions/phases/EndPhase.ts
import { Phase, type PhaseContext } from "./Phase";
import type { LegalActionsResponse, ActionResponse } from "../../../../shared/models/ApiContexts";
import type { GameAction } from "../../../../shared/models/ActionParams";

export class EndPhase extends Phase {
  readonly name = "End";

  async getLegalActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    return {
      actions: [],
      message: "End phase - Ready Command Bunkers and determine player order",
    };
  }

  async executePhaseAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    return {
      success: false,
      error: "End phase actions not yet implemented",
    };
  }
}
