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
import { BaseBot } from "../bots/BaseBot";
import { ActionResponse } from "../../../../shared/models/GameAction";

const PHASE_MAP: Record<string, new () => Phase> = {
  GameStart: GameStartPhase,
  Outreach: OutreachPhase,
  Expansion: ExpansionPhase,
  Empire: EmpirePhase,
  End: EndPhase,
};

export class ThroneworldPhaseManager extends BasePhaseManager {
  private bot: BaseBot;
  private executingBotTurns: boolean = false;

  constructor(gameId: string, db: GameDatabaseAdapter) {
    super(gameId, db, PHASE_MAP);
    // Set delay to 0 for fast testing, 1000 for production
    const botDelay = process.env.BOT_DELAY_MS ? parseInt(process.env.BOT_DELAY_MS) : 1000;
    this.bot = new BaseBot(botDelay);
  }

  async getGameState() {
    if (!this.state) {
      this.state = await this.reloadGameState();
    }
    return this.state;
  }

  async reloadGameState(): Promise<GameState> {
    const state = (await this.db.getDocument(`games/${this.gameId}`)) as ThroneworldGameState;

    // Initialize playerViews object
    if (!state.playerViews) state.playerViews = {};

    // Load neutral view
    const neutralView = await this.db.getDocument(`games/${this.gameId}/playerViews/neutral`);
    if (neutralView) {
      state.playerViews["neutral"] = neutralView as ThroneworldPlayerView;
    }

    // Load each player's view
    for (const playerId of Object.keys(state.players)) {
      const playerView = await this.db.getDocument(`games/${this.gameId}/playerViews/${playerId}`);
      if (playerView) {
        state.playerViews[playerId] = playerView as ThroneworldPlayerView;
      }
    }

    this.state = state;
    return state;
  }

  async postExecuteAction(playerId: string, result: ActionResponse): Promise<ActionResponse> {
    // Let base handle phase logic
    const updatedResult = await super.postExecuteAction(playerId, result);
    return updatedResult;
  }

  /**
   * Called after database transaction commits
   * Execute bot turns for all bots in currentPlayers
   */
  async postCommitAction(): Promise<void> {
    // Prevent recursive/concurrent execution
    if (this.executingBotTurns) return;

    this.executingBotTurns = true;

    try {
      // Keep executing bots until none are left in currentPlayers
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const state = await this.reloadGameState();
        const currentPlayers = state.state.currentPlayers || [];

        // Find first bot in currentPlayers
        const botId = currentPlayers.find((p) => p.startsWith("bot-"));

        if (!botId) break; // No more bots

        console.log(`Executing bot turn for ${botId}`);

        try {
          await this.bot.takeTurn(botId, this);
        } catch (err) {
          console.error(`Bot ${botId} failed:`, err);
          // Bot failed, but continue to next bot
          break; // Exit to avoid infinite loop on persistent failures
        }
      }
    } finally {
      this.executingBotTurns = false;
    }
  }
}
