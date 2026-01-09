// /modules/throneworld/functions/actions/CombatRoundAction.ts
import { ActionResponse } from "../../../../shared/models/GameAction";
import { SystemAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { executeOneCombatRound, CombatMetadata } from "./CombatHelpers";

/**
 * System action that executes one round of combat
 * This is called automatically when all players pass
 */
export class CombatRoundAction extends SystemAction {
  constructor() {
    super("combatRound");
  }

  async execute(state: GameState, _playerId: string): Promise<ActionResponse> {
    const tw = state as ThroneworldGameState;
    const combat = tw.state.phaseMetadata as unknown as CombatMetadata;

    if (!combat) {
      return { action: this, success: false, error: "No active combat" };
    }

    // Execute one round of combat (rolls dice, applies casualties)
    executeOneCombatRound(tw, combat);

    const combatType = combat.spaceCombatActive ? "Space" : "Ground";
    let message = `${combatType} Combat Round ${combat.roundNumber}`;

    if (combat.lastRoundResults) {
      const { attackerHits, defenderHits, attackerCasualties, defenderCasualties } = combat.lastRoundResults;
      message += `: Attacker scored ${attackerHits} hits (${defenderCasualties.length} casualties), Defender scored ${defenderHits} hits (${attackerCasualties.length} casualties)`;
    }

    return {
      action: this,
      success: true,
      message,
      undoable: false,
    };
  }
}
