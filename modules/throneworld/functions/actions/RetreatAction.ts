// /modules/throneworld/functions/actions/RetreatAction.ts
import { ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { executeRetreat, CombatMetadata } from "./CombatHelpers";

export class RetreatAction extends GameAction {
  constructor() {
    super({
      type: "retreat",
      undoable: false,
      params: [],
      finalize: { mode: "confirm", label: "Retreat" },
    });
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    const tw = state as ThroneworldGameState;
    const combat = tw.state.phaseMetadata as unknown as CombatMetadata;

    if (!combat) {
      return { action: this, success: false, error: "No active combat" };
    }

    if (!combat.spaceCombatActive) {
      return { action: this, success: false, error: "Cannot retreat from ground combat" };
    }

    const retreatHexId = executeRetreat(tw, combat, playerId);

    if (!retreatHexId) {
      return { action: this, success: false, error: "No valid retreat location" };
    }

    return {
      action: this,
      success: true,
      message: `${playerId} retreated to ${retreatHexId}`,
      undoable: false,
    };
  }
}

registerAction("retreat", RetreatAction);
