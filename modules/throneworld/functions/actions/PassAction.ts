// /modules/throneworld/functions/actions/PassAction.ts
import { ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import { registerAction } from "../../../../shared-backend/ActionRegistry";

interface PassActionOptions {
  label?: string;
  confirmLabel?: string;
  historyMessage?: string;
  requireConfirm?: boolean;
  requireConcurrency?: boolean;
}

export class PassAction extends GameAction {
  protected message: string;

  constructor(options?: PassActionOptions) {
    const {
      label = "Pass",
      confirmLabel = "Pass",
      historyMessage = "Passed",
      requireConfirm = true,
      requireConcurrency = false,
    } = options ?? {};

    super({
      type: "pass",
      undoable: false,
      requireConcurrency: requireConcurrency,
      params: [
        {
          name: "passing",
          type: "choice",
          choices: [{ id: "pass", label: label }],
        },
      ],
      finalize: { mode: requireConfirm ? "confirm" : "auto", label: confirmLabel },
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
