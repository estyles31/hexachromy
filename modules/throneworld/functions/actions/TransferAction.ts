// /modules/throneworld/functions/actions/TransferAction.ts
import { ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import { registerAction } from "../../../../shared-backend/ActionRegistry";

export class TransferAction extends GameAction {
  constructor() {
    super({
      type: "transfer",
      undoable: true,
      params: [],
      finalize: { mode: "confirm", label: "Transfer (Not Implemented)" }
    });
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    // TODO: Implement transfer logic
    // - Select fleet
    // - Select units to transfer
    // - Select destination fleet or create new fleet
    return {
      action: this,
      success: false,
      error: "Transfer action not yet implemented"
    };
  }
}

registerAction("transfer", TransferAction);