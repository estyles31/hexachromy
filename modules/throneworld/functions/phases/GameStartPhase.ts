// /modules/throneworld/functions/phases/GameStartPhase.ts
import { Phase, type PhaseContext } from "./Phase";
import type { GameAction, LegalActionsResponse, ActionResponse } from "../../../../shared/models/ApiContexts";
export class GameStartPhase extends Phase {
  readonly name = "GameStart";

  async getLegalActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    // TODO: Implement game start legal actions
    // - Choose race (if not assigned)
    // - Choose homeworld location (if not assigned)
    // - Ready up when done
    
    return {
      actions: [],
      message: "Game is starting. Choose your race and homeworld.",
    };
  }

  async executeAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    // TODO: Handle actions like:
    // - { type: "choose_race", raceId: "Buralti" }
    // - { type: "choose_homeworld", hexId: "A5" }
    // - { type: "ready" }
    
    return {
      success: false,
      error: "GameStart actions not yet implemented",
    };
  }

  async getMessageEnvelope(ctx: PhaseContext, playerId: string): Promise<string> {
    // TODO: Return instructions based on what the player still needs to do
    return "Choose your race and homeworld location.";
  }
}
