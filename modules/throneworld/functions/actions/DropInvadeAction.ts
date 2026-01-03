// /modules/throneworld/functions/actions/DropInvadeAction.ts
import { ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { executeDropInvade, CombatMetadata } from "./CombatHelpers";

export class DropInvadeAction extends GameAction {
  constructor() {
    super({
      type: "dropInvade",
      undoable: false,
      params: [],
      finalize: { mode: "confirm", label: "Drop Invade" },
    });
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    const tw = state as ThroneworldGameState;
    const combat = tw.state.phaseMetadata as unknown as CombatMetadata;

    if (!combat) {
      return { action: this, success: false, error: "No active combat" };
    }

    if (!combat.spaceCombatActive) {
      return { action: this, success: false, error: "Space combat already ended" };
    }

    if (playerId !== combat.attackerId) {
      return { action: this, success: false, error: "Only attacker can drop invade" };
    }

    executeDropInvade(tw, combat);

    return {
      action: this,
      success: true,
      message: "Drop invasion executed",
      undoable: false,
    };
  }
}

registerAction("dropInvade", DropInvadeAction);
