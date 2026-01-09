// /modules/throneworld/functions/phases/CombatSubPhase.ts
import { Phase } from "../../../../shared-backend/Phase";
import { PhaseContext } from "../../../../shared/models/PhaseContext";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import { ActionResponse } from "../../../../shared/models/GameAction";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { PassAction } from "../actions/PassAction";
import { RetreatAction } from "../actions/RetreatAction";
import { DropInvadeAction } from "../actions/DropInvadeAction";
import { CombatRoundAction } from "../actions/CombatRoundAction";
import {
  CombatMetadata,
  canRetreat,
  canDropInvade,
  isCombatOver,
  findAllCombatHexes,
  initiateCombat,
} from "../actions/CombatHelpers";
import type { ExpansionPhaseMetadata } from "./ExpansionPhase";

export class CombatSubPhase extends Phase {
  readonly name = "CombatSubPhase";

  async onPhaseStart(_ctx: PhaseContext): Promise<ActionResponse> {
    // Combat metadata should already be initialized by whoever triggered combat
    return {
      action: new PassAction(),
      success: true,
      message: "Combat initiated",
    };
  }

  async loadPhase(ctx: PhaseContext): Promise<void> {
    const state = ctx.gameState as ThroneworldGameState;
    const { expansionMeta, combat } = this.getMetadata(state);

    // If we have combat and it's still active, continue it
    if (combat && !isCombatOver(state, combat)) {
      return; // Combat in progress, continue
    }

    // Combat is over or no combat - check for next combat
    const actingPlayerId = combat?.actingPlayerId || state.playerOrder[0];
    const combatInfos = findAllCombatHexes(state, actingPlayerId);

    if (combatInfos.length > 0) {
      // Start next combat
      const combatInfo = combatInfos[0];
      const jumpMeta = expansionMeta.jumpMetadata?.[combatInfo.hexId];

      const newCombat = initiateCombat(
        state,
        combatInfo.hexId,
        combatInfo.attackerId,
        combatInfo.defenderId,
        actingPlayerId,
        jumpMeta?.inCommRange ?? false,
        jumpMeta?.sourceHexId
      );

      if (newCombat) {
        expansionMeta.activeCombat = newCombat;
      }
    } else {
      // No more combats - clear combat and return to Expansion
      delete expansionMeta.activeCombat;
      state.state.currentPhase = "Expansion";
    }
  }

  private getMetadata(state: ThroneworldGameState) {
    const expansionMeta = state.state.phaseMetadata as ExpansionPhaseMetadata;
    return { expansionMeta, combat: expansionMeta.activeCombat! };
  }

  protected async getPhaseSpecificActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const { combat } = this.getMetadata(state);

    // Determine if this player is involved in the current combat phase
    const isAttacker = playerId === combat.attackerId;
    const isDefender = playerId === combat.defenderId;

    let isInvolvedInCurrentPhase = false;
    if (combat.spaceCombatActive) {
      // Check if player has space forces
      const system = state.state.systems[combat.hexId];
      if (system) {
        const hasSpaceUnits = (system.fleetsInSpace[playerId] || []).some((f) => f.spaceUnits.length > 0);
        isInvolvedInCurrentPhase = hasSpaceUnits && (isAttacker || isDefender);
      }
    } else if (combat.groundCombatActive) {
      // Check if player has ground forces
      const system = state.state.systems[combat.hexId];
      if (system) {
        const hasGroundUnits = (system.unitsOnPlanet[playerId] || []).length > 0;
        isInvolvedInCurrentPhase = hasGroundUnits && (isAttacker || isDefender);
      }
    }

    if (!isInvolvedInCurrentPhase) {
      return {
        actions: [],
        message: "Waiting for other players",
      };
    }

    // Check if this player has already passed this round
    if (combat.playersPassed.includes(playerId)) {
      return {
        actions: [],
        message: "Waiting for other players",
      };
    }

    const actions = [];

    // Space combat actions
    if (combat.spaceCombatActive) {
      if (canRetreat(combat, playerId)) {
        actions.push(new RetreatAction());
      }

      if (playerId === combat.attackerId && canDropInvade(state, combat)) {
        actions.push(new DropInvadeAction());
      }
    }

    // Always can pass
    actions.push(
      new PassAction({
        label: "Pass (Continue Combat)",
        confirmLabel: "Continue to next round?",
        historyMessage: "Passed",
      })
    );

    const roundType = combat.spaceCombatActive ? "Space" : "Ground";
    const roundNum = combat.roundNumber + 1;

    return {
      actions,
      message: `${roundType} Combat - Round ${roundNum}`,
    };
  }

  async onActionCompleted(ctx: PhaseContext, playerId: string, result: ActionResponse): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const expansionMeta = state.state.phaseMetadata as ExpansionPhaseMetadata;
    const combat = expansionMeta.activeCombat;

    if (!combat) return result;

    if (result.action.type === "pass") {
      if (!combat.playersPassed.includes(playerId)) {
        combat.playersPassed.push(playerId);
      }

      if (this.haveAllPlayersPassed(combat)) {
        const combatRoundAction = new CombatRoundAction();
        const roundResult = await combatRoundAction.execute(state, "system");

        if (!roundResult.success) {
          return roundResult;
        }

        combat.playersPassed = [];

        if (isCombatOver(state, combat)) {
          delete expansionMeta.activeCombat;
        }
      }
    } else if (result.action.type === "retreat") {
      delete expansionMeta.activeCombat;
    } else if (result.action.type === "dropInvade") {
      if (!combat.playersPassed.includes(playerId)) {
        combat.playersPassed.push(playerId);
      }

      if (this.haveAllPlayersPassed(combat)) {
        const combatRoundAction = new CombatRoundAction();
        const roundResult = await combatRoundAction.execute(state, "system");

        if (!roundResult.success) {
          return roundResult;
        }

        combat.playersPassed = [];

        if (isCombatOver(state, combat)) {
          delete expansionMeta.activeCombat;
        }
      }
    }

    return result;
  }

  private haveAllPlayersPassed(combat: CombatMetadata): boolean {
    const activePlayers = [combat.attackerId, combat.defenderId].filter((p) => p !== "neutral");

    // Neutral always auto-passes
    if (combat.defenderId === "neutral") {
      return combat.playersPassed.includes(combat.attackerId);
    }
    if (combat.attackerId === "neutral") {
      return combat.playersPassed.includes(combat.defenderId);
    }

    // Both players must pass
    return activePlayers.every((p) => combat.playersPassed.includes(p));
  }
}
