// /modules/throneworld/functions/undoAction.ts
import type { UndoContext, UndoResponse, ActionHistoryEntry } from "../../../shared/models/ApiContexts";
import type { ThroneworldGameState } from "../shared/models/GameState.Throneworld";
import { PhaseManager } from "./phases/PhaseManager";

export async function undoAction(ctx: UndoContext): Promise<UndoResponse> {
  const { gameId, playerId, expectedVersion, db } = ctx;

  try {
    // Use transaction for atomic read-check-write
    return await db.runTransaction(async (transaction) => {
      // Load game state
      const gameState = await transaction.get<ThroneworldGameState>(`games/${gameId}`);
      if (!gameState) {
        throw new Error("Game not found");
      }

      // Check for version mismatch (optimistic concurrency control)
      if (expectedVersion !== undefined && expectedVersion !== gameState.version) {
        throw new Error("stale_state");
      }

      // Get player's undo stack
      const undoStack = gameState.playerUndoStacks?.[playerId] || [];
      
      if (undoStack.length === 0) {
        throw new Error("No action to undo");
      }

      // Pop the last action from the stack
      const lastAction = undoStack[undoStack.length - 1];

      if (!lastAction.undoAction) {
        throw new Error("No undo action available");
      }

      // Validate undo is still legal based on current game state
      if (!validateUndoIsLegal(gameState, playerId, lastAction)) {
        throw new Error("Cannot undo - game state has changed");
      }

      // Apply the undo action directly (not as a new action)
      const phaseManager = new PhaseManager(gameState, db);
      const undoResult = await phaseManager.applyUndo(playerId, lastAction.undoAction);

      if (!undoResult.success || !undoResult.stateChanges) {
        throw new Error(undoResult.error || "Failed to apply undo");
      }

      const updatedState = undoResult.stateChanges as ThroneworldGameState;
      
      // Increment version
      updatedState.version = gameState.version + 1;

      // Mark the original action as undone in the action log
      const markedAsUndone = { ...lastAction, undone: true };
      transaction.set(`games/${gameId}/actionLog/${lastAction.sequence}`, markedAsUndone);

      // Pop from undo stack
      if (!updatedState.playerUndoStacks) {
        updatedState.playerUndoStacks = {};
      }
      if (!updatedState.playerUndoStacks[playerId]) {
        updatedState.playerUndoStacks[playerId] = [];
      }
      updatedState.playerUndoStacks[playerId] = undoStack.slice(0, -1);

      // Save updated state
      transaction.set(`games/${gameId}`, updatedState);

      return {
        success: true,
        message: "Action undone successfully",
      };
    });
  } catch (error) {
    console.error("Error undoing action:", error);
    
    if (error instanceof Error) {
      if (error.message === "stale_state") {
        return {
          success: false,
          error: "stale_state",
          message: "Game state has changed. Please refresh and try again.",
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Unknown error",
    };
  }
}

/**
 * Validate that an undo is still legal based on current game state
 * This catches cases where the undo stack is out of sync with game rules
 */
function validateUndoIsLegal(
  gameState: ThroneworldGameState,
  playerId: string,
  actionToUndo: ActionHistoryEntry
): boolean {
  // Check 1: Must still be in the same phase as when action was taken
  if (actionToUndo.resultingPhase !== gameState.state.currentPhase) {
    return false;
  }

  // Check 2: If there's a current player (turn-based phase), must be that player
  if (gameState.state.currentPlayer && gameState.state.currentPlayer !== playerId) {
    return false;
  }

  // Check 3: Action must still be marked as undoable
  if (!actionToUndo.undoable) {
    return false;
  }

  // Check 4: Action must not already be undone
  if (actionToUndo.undone) {
    return false;
  }

  // Future: Add phase-specific validation if needed
  // For example, ExpansionPhase might check if the player has already ended their turn

  return true;
}
