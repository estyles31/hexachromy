// /modules/throneworld/functions/throneworldGame.ts
import { BackendModuleDefinition } from "../../BackendModuleDefinition";
import { ThroneworldGameDefinition } from "../shared/models/GameDefinition.Throneworld";
import { createGame as createThroneworldGame } from "./createThroneworldGame";
import { getPlayerView as getTWPlayerView } from "./throneworldPlayerView";
import { handleAction } from "./ActionHandler";
import { getLegalActions } from "./LegalActions";
import { undoAction } from "./UndoAction";

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

  async getLegalActions(ctx) {
    return getLegalActions(ctx);
  },

  async handleAction(ctx) {
    return handleAction(ctx);
  },

  async undoAction(ctx) {
    return undoAction(ctx);
  },
};