// /modules/throneworld/functions/legalActions.ts
import type { LegalActionsContext, LegalActionsResponse } from "../../../shared/models/ApiContexts";
import type { ThroneworldGameState } from "../shared/models/GameState.Throneworld";
import { PhaseManager } from "./phases/PhaseManager";

export async function getLegalActions(ctx: LegalActionsContext): Promise<LegalActionsResponse> {
  const { gameId, playerId, db } = ctx;

  try {
    // Load game state
    const gameState = await db.getDocument<ThroneworldGameState>(`games/${gameId}`);
    if (!gameState) {
      return {
        actions: [],
        message: "Game not found",
      };
    }

    // Create phase manager and get legal actions
    const phaseManager = new PhaseManager(gameState, db);
    const response = await phaseManager.getLegalActions(playerId);

    // Check if player can undo
    const undoStack = gameState.playerUndoStacks?.[playerId] || [];
    const canUndo = undoStack.length > 0;

    return {
      ...response,
      canUndo,
    };
  } catch (error) {
    console.error("Error getting legal actions:", error);
    return {
      actions: [],
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
