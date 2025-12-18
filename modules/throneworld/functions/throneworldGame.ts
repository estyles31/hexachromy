// /modules/throneworld/functions/throneworldGame.ts
import type { BackendModuleDefinition, ParamChoicesContext } from "../../BackendModuleDefinition";
import { ThroneworldGameDefinition } from "../shared/models/GameDefinition.Throneworld";
import { createGame as createThroneworldGame } from "./createThroneworldGame";
import { getPlayerView as getTWPlayerView } from "./throneworldPlayerView";
import { handleAction } from "./ActionHandler";
import { getLegalActions } from "./LegalActions";
import { undoAction } from "./UndoAction";
import type { ParameterValuesContext } from "../../../shared/models/ApiContexts";
import type { ParamChoicesResponse } from "../../../shared/models/ActionParams";
import type { ThroneworldGameState } from "../shared/models/GameState.Throneworld";
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

  // Legacy method - keep for backwards compatibility
  async getParameterValues(ctx: ParameterValuesContext) {
    const { gameId, playerId, actionType, parameterName, partialParameters, db } = ctx;

    const gameState = await db.getDocument<ThroneworldGameState>(`games/${gameId}`);
    if (!gameState) {
      throw new Error("Game not found");
    }

    const phaseManager = new PhaseManager(gameState, db);
    
    // Convert to new format
    const filledParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(partialParameters)) {
      filledParams[key] = String(value);
    }
    
    const response = await phaseManager.getParamChoices(playerId, actionType, parameterName, filledParams);
    
    // Convert back to old format for compatibility
    return {
      values: response.choices.map(c => c.id),
      renderHint: {
        category: "hex-select" as const,
        highlightHexes: response.choices
          .filter(c => c.type === "boardSpace")
          .map(c => c.displayHint?.hexId ?? c.id),
        message: response.message,
      },
      error: response.error,
    };
  },

  // New method
  async getParamChoices(ctx: ParamChoicesContext): Promise<ParamChoicesResponse> {
    const { gameId, playerId, actionType, paramName, filledParams, db } = ctx;

    const gameState = await db.getDocument<ThroneworldGameState>(`games/${gameId}`);
    if (!gameState) {
      return { choices: [], error: "Game not found" };
    }

    const phaseManager = new PhaseManager(gameState, db);
    return phaseManager.getParamChoices(playerId, actionType, paramName, filledParams);
  },
};
