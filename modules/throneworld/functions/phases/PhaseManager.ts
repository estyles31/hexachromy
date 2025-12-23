// /modules/throneworld/functions/phases/PhaseManager.ts
import type { Phase } from "../../../../shared-backend/Phase";
import { GameStartPhase } from "./GameStartPhase";
import { OutreachPhase } from "./OutreachPhase";
import { ExpansionPhase } from "./ExpansionPhase";
import { EmpirePhase } from "./EmpirePhase";
import { EndPhase } from "./EndPhase";
import { BasePhaseManager } from "../../../../shared-backend/BasePhaseManager";
import { GameDatabaseAdapter } from "../../../../shared/models/GameDatabaseAdapter";
import { GameState } from "../../../../shared/models/GameState";
import { ThroneworldGameState, ThroneworldPlayerView } from "../../shared/models/GameState.Throneworld";

const PHASE_MAP: Record<string, new () => Phase> = {
  "GameStart": GameStartPhase,
  "Outreach": OutreachPhase,
  "Expansion": ExpansionPhase,
  "Empire": EmpirePhase,
  "End": EndPhase,
};

export class ThroneworldPhaseManager extends BasePhaseManager {
  constructor(gameId: string, db: GameDatabaseAdapter) {
    super(gameId, db, PHASE_MAP);
  }
  
  async getGameState() {
    if(!this.state) {
      this.state = await this.reloadGameState();
    }
    return this.state;
  }

async reloadGameState(): Promise<GameState> {
  const state = await this.db.getDocument(`games/${this.gameId}`) as ThroneworldGameState;

  const neutralView = await this.db.getDocument(
    `games/${this.gameId}/playerViews/neutral`
  );

  state.playerView = neutralView as ThroneworldPlayerView;
  return state;
}


}