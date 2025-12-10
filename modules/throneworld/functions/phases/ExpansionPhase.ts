// /modules/throneworld/functions/phases/ExpansionPhase.ts
import { Phase, type PhaseContext } from "./Phase";
import type { GameAction, LegalActionsResponse, ActionResponse } from "../../../../shared/models/ApiContexts";

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
      success: false,
      error: "Expansion actions not yet implemented",
    };
  }
}