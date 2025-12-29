// /modules/throneworld/functions/actions/PassAction.ts
import { ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import { registerAction } from "../../../../shared-backend/ActionRegistry";

export class PassAction extends GameAction {
  constructor() {
    super({
      type: "pass",
      undoable: false,
      params: [],
      finalize: { mode: "confirm", label: "Pass (End Production)" }
    });
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    // Pass does nothing to the state - it just signals completion
    return {
      action: this,
      success: true,
      message: "Passed production"
    };
  }
}

registerAction("pass", PassAction);