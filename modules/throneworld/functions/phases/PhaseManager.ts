// /modules/throneworld/functions/phases/PhaseManager.ts
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type { GameDatabaseAdapter } from "../../../../shared/models/GameDatabaseAdapter";
import type { ParamChoicesResponse } from "../../../../shared/models/ActionParams";
import type { Phase, PhaseContext } from "./Phase";
import { GameStartPhase } from "./GameStartPhase";
import { OutreachPhase } from "./OutreachPhase";
import { ExpansionPhase } from "./ExpansionPhase";
import { EmpirePhase } from "./EmpirePhase";
import { EndPhase } from "./EndPhase";

const PHASE_MAP: Record<string, new () => Phase> = {
  "GameStart": GameStartPhase,
  "Outreach": OutreachPhase,
  "Expansion": ExpansionPhase,
  "Empire": EmpirePhase,
  "End": EndPhase,
};

export class PhaseManager {
  private phase: Phase;
  private ctx: PhaseContext;

  constructor(gameState: ThroneworldGameState, db: GameDatabaseAdapter) {
    this.ctx = { gameState, db };

    const phaseName = gameState.state.currentPhase;
    const PhaseClass = PHASE_MAP[phaseName];

    if (!PhaseClass) {
      throw new Error(`Unknown phase: ${phaseName}`);
    }

    this.phase = new PhaseClass();
  }

  async getLegalActions(playerId: string) {
    return this.phase.getLegalActions(this.ctx, playerId);
  }

  async executeAction(playerId: string, action: any) {
    return this.phase.executeAction(this.ctx, playerId, action);
  }

  async getParamChoices(
    playerId: string,
    actionType: string,
    paramName: string,
    filledParams: Record<string, string>
  ): Promise<ParamChoicesResponse> {
    return this.phase.getParamChoices(this.ctx, playerId, actionType, paramName, filledParams);
  }

  async applyUndo(playerId: string, undoAction: any) {
    return this.phase.applyUndo(this.ctx, playerId, undoAction);
  }

  getCurrentPhase(): Phase {
    return this.phase;
  }
}
