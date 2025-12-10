// /modules/throneworld/functions/actionHandler.ts
import type { ActionContext, ActionHistoryEntry, ActionResponse } from "../../../shared/models/ApiContexts";
import type { ThroneworldGameState } from "../shared/models/GameState.Throneworld";
import { PhaseManager } from "./phases/PhaseManager";
import { randomUUID } from "crypto";

export async function handleAction(ctx: ActionContext): Promise<ActionResponse> {
  const { gameId, playerId, action, db } = ctx;

  try {
    // Use transaction for atomic read-check-write
    return await db.runTransaction(async (transaction) => {
      // Load game state
      const gameState = await transaction.get<ThroneworldGameState>(`games/${gameId}`);
      if (!gameState) {
        throw new Error("Game not found");
      }

      // Check for version mismatch (optimistic concurrency control)
      if (action.expectedVersion !== undefined && action.expectedVersion !== gameState.version) {
        throw new Error("stale_state");
      }

      // Create phase manager and delegate
      const phaseManager = new PhaseManager(gameState, db);
      const response = await phaseManager.executeAction(playerId, action);

      // If action was successful, update game state
      if (response.success && response.stateChanges) {
        const updatedState = response.stateChanges as ThroneworldGameState;
        
        // Increment version
        updatedState.version = gameState.version + 1;
        
        // Increment action sequence
        const sequence = updatedState.actionSequence;
        updatedState.actionSequence = sequence + 1;

        // Create action log entry
        const actionEntry: ActionHistoryEntry = {
          actionId: randomUUID(),
          sequence,
          timestamp: Date.now(),
          playerId,
          action,
          undoAction: response.undoAction,
          undoable: action.undoable && Boolean(response.undoAction),
          undone: false,  // New actions are not undone
          resultingPhase: updatedState.state.currentPhase,
        };

        // Store in permanent action log
        transaction.set(`games/${gameId}/actionLog/${sequence}`, actionEntry);

        // Update player's undo stack
        if (!updatedState.playerUndoStacks) {
          updatedState.playerUndoStacks = {};
        }
        if (!updatedState.playerUndoStacks[playerId]) {
          updatedState.playerUndoStacks[playerId] = [];
        }

        if (actionEntry.undoable) {
          // Push to player's undo stack
          updatedState.playerUndoStacks[playerId].push(actionEntry);
        } else {
          // Non-undoable action clears the player's undo stack
          updatedState.playerUndoStacks[playerId] = [];
        }

        // Save updated game state
        transaction.set(`games/${gameId}`, updatedState);

        return {
          ...response,
          stateChanges: updatedState,
        };
      }

      return response;
    });
  } catch (error) {
    console.error("Error handling action:", error);
    
    if (error instanceof Error && error.message === "stale_state") {
      return {
        success: false,
        error: "stale_state",
        message: "Game state has changed. Please refresh and try again.",
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Clear all players' undo stacks (called on phase transitions)
 */
export function clearAllUndoStacks(gameState: ThroneworldGameState): void {
  if (gameState.playerUndoStacks) {
    for (const playerId in gameState.playerUndoStacks) {
      gameState.playerUndoStacks[playerId] = [];
    }
  }
}

/**
 * Clear a specific player's undo stack (called on turn end or undo boundary)
 */
export function clearPlayerUndoStack(gameState: ThroneworldGameState, playerId: string): void {
  if (gameState.playerUndoStacks && gameState.playerUndoStacks[playerId]) {
    gameState.playerUndoStacks[playerId] = [];
  }
}
