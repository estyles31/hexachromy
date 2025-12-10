// /modules/throneworld/functions/phases/OutreachPhase.ts
import { Phase, type PhaseContext } from "./Phase";
import type { GameAction, LegalActionsResponse, ActionResponse } from "../../../../shared/models/ApiContexts";

export class OutreachPhase extends Phase {
  readonly name = "Outreach";

  async getLegalActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    return {
      actions: [],
      message: "Outreach phase - perform 2 Scans or Jumps",
    };
  }

  async executeAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    return {
      success: false,
      error: "Outreach actions not yet implemented",
    };
  }
}
