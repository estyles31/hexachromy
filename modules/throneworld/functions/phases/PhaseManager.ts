// /modules/throneworld/functions/phases/PhaseManager.ts
import type  { ThroneworldGameState } from "../../shared/models/GameState.Throneworld" 
import type { GameDatabaseAdapter } from "../../../../shared/models/GameDatabaseAdapter";
import type { Phase, PhaseContext } from "./Phase";
import { GameStartPhase } from "./GameStartPhase";
import { OutreachPhase } from "./OutreachPhase";
import { ExpansionPhase } from "./ExpansionPhase";
import { EmpirePhase } from "./EmpirePhase";
import { EndPhase } from "./EndPhase";

/**
 * Maps phase names to their implementations
 */
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

  /**
   * Get legal actions for a player
   */
  async getLegalActions(playerId: string) {
    return this.phase.getLegalActions(this.ctx, playerId);
  }

  /**
   * Execute a player action
   */
  async executeAction(playerId: string, action: any) {
    return this.phase.executeAction(this.ctx, playerId, action);
  }

  /**
   * Get legal values for a parameter in a multi-parameter action
   */
  async getParameterValues(
    playerId: string,
    actionType: string,
    parameterName: string,
    partialParameters: Record<string, unknown>
  ) {
    return this.phase.getParameterValues(
      this.ctx,
      playerId,
      actionType,
      parameterName,
      partialParameters
    );
  }

  /**
   * Get message envelope for a player
   */
  async getMessageEnvelope(playerId: string) {
    if (this.phase.getMessageEnvelope) {
      return this.phase.getMessageEnvelope(this.ctx, playerId);
    }
    return undefined;
  }

  /**
   * Apply an undo action without recording it in history
   */
  async applyUndo(playerId: string, undoAction: any) {
    return this.phase.applyUndo(this.ctx, playerId, undoAction);
  }

  /**
   * Get the current phase instance (for testing or advanced use)
   */
  getCurrentPhase(): Phase {
    return this.phase;
  }
}