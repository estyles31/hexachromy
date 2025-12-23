// /modules/throneworld/functions/throneworldGame.ts
import type { BackendModuleDefinition, IPhaseManager } from "../../../shared-backend/BackendModuleDefinition";
import { ThroneworldGameDefinition } from "../shared/models/GameDefinition.Throneworld";
import { createGame as createThroneworldGame } from "./createThroneworldGame";
import { getPlayerView as getTWPlayerView } from "./throneworldPlayerView";
import { ThroneworldPhaseManager } from "./phases/PhaseManager";
import { GameDatabaseAdapter } from "../../../shared/models/GameDatabaseAdapter";

export const throneworldBackend: BackendModuleDefinition = {
  id: "throneworld",

  getGameDefinition() {
    return ThroneworldGameDefinition;
  },

  async createGame(ctx) {
    return createThroneworldGame(ctx);
  },

  async getPlayerView(ctx) {
    return getTWPlayerView(ctx);
  },

  getPhaseManager: function (gameId: string, db: GameDatabaseAdapter): IPhaseManager {
    return  new ThroneworldPhaseManager(gameId, db);
  }
};
