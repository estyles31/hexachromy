// modules/throneworld/backend/index.ts

import { BackendModuleDefinition } from "../../BackendModuleDefinition";
import { ThroneworldGameDefinition } from "../shared/models/GameDefinition.Throneworld";
import { createGame as createThroneworldGame } from "./createThroneworldGame";
import { getPlayerView as getTWPlayerView } from "./throneworldPlayerView";
// import { buildPlayerResponse } from "./playerView";

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
};
