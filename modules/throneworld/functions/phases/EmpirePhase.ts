// /modules/throneworld/functions/phases/EmpirePhase.ts
import type { GameAction, LegalActionsResponse, ActionResponse } from "../../../../shared/models/ApiContexts";
import { Phase, type PhaseContext } from "./Phase";

export class EmpirePhase extends Phase {
  readonly name = "Empire";

  async getLegalActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    return {
      actions: [],
      message: "Empire phase - Research and Production",
    };
  }

  async executeAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    return {
      success: false,
      error: "Empire actions not yet implemented",
    };
  }
}
