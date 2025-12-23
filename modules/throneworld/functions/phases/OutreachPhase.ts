import { Phase, PhaseContext } from "../../../../shared-backend/Phase";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { JumpAction } from "../actions/JumpAction";
import { ScanAction } from "../actions/ScanAction";

export class OutreachPhase extends Phase {
  readonly name = "Outreach";

  protected async getPhaseSpecificActions(
    ctx: PhaseContext,
    playerId: string
  ): Promise<LegalActionsResponse> {

    const state = ctx.gameState as ThroneworldGameState;

    const used = this.countPlayerOutreachActions(state, playerId);

    if (used >= 2) {
      return {
        actions: [],
        message: "You have used both Outreach actions.",
      };
    }

    return {
      message: `Outreach actions remaining: ${2 - used}`,
      actions: [
        new ScanAction(),
        new JumpAction(),
        // { type: "reorganize_fleet" },
      ]
    };
  }

  private countPlayerOutreachActions(
    state: ThroneworldGameState,
    playerId: string
  ): number {

    let used = 0;

    for (const sys of Object.values(state.state.systems)) {
      const units = sys.unitsOnPlanet[playerId];
      if (!units) continue;
      for (const u of units) {
        if (u.hasMoved) used++;
      }
    }
    return used;
  }
}
