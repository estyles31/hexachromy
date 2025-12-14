// /modules/throneworld/functions/throneworldGame.ts
import { BackendModuleDefinition } from "../../BackendModuleDefinition";
import { ThroneworldGameDefinition } from "../shared/models/GameDefinition.Throneworld";
import { createGame as createThroneworldGame } from "./createThroneworldGame";
import { getPlayerView as getTWPlayerView } from "./throneworldPlayerView";
import { handleAction } from "./ActionHandler";
import { getLegalActions } from "./LegalActions";
import { undoAction } from "./UndoAction";
import { ParameterValuesContext } from "../../../shared/models/ApiContexts";
import { ThroneworldGameState } from "../shared/models/GameState.Throneworld";
import { PhaseManager } from "./phases/PhaseManager";

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

  async getParameterValues(ctx: ParameterValuesContext) {
    const { gameId, playerId, actionType, parameterName, partialParameters, db } = ctx;

    // Load game state
    const gameState = await db.getDocument<ThroneworldGameState>(`games/${gameId}`);
    if (!gameState) {
      throw new Error("Game not found");
    }

    // Use PhaseManager to get parameter values
    const phaseManager = new PhaseManager(gameState, db);
    return phaseManager.getParameterValues(playerId, actionType, parameterName, partialParameters);
  },
};