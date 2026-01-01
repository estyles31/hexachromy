// /modules/throneworld/functions/actions/PassAction.ts
import { ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import { registerAction } from "../../../../shared-backend/ActionRegistry";

export class PassAction extends GameAction {
  protected message: string;

  constructor(label = "Pass", historyMessage = "Passed") {
    super({
      type: "pass",
      undoable: false,
      params: [],
      finalize: { mode: "confirm", label: label }
    });

    this.message = historyMessage;
  }

  async execute(_state: GameState, _playerId: string): Promise<ActionResponse> {
    // Pass does nothing to the state - it just signals completion
    return {
      action: this,
      success: true,
      message: this.message,
    };
  }
}

registerAction("pass", PassAction);