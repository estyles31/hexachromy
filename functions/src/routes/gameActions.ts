// functions/src/routes/gameActions.ts
import { Router } from "express";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { backendModules } from "../../../modules/backend.js";
import { dbAdapter } from "../services/database.js";

export const gameActionsRouter = Router();

// GET /:gameId/actions - Get legal actions for current player
gameActionsRouter.get("/:gameId/actions", async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = (req as AuthenticatedRequest).user.uid;

    // Load game state to get game type
    const gameState = await dbAdapter.getDocument(`games/${gameId}`);
    if (!gameState) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    const module = backendModules[(gameState as any).gameType];
    if (!module?.getLegalActions) {
      res.status(400).json({ error: "Game module does not support actions" });
      return;
    }

    const response = await module.getLegalActions({
      gameId,
      playerId: userId,
      db: dbAdapter,
    });

    res.json(response);
  } catch (err) {
    console.error("Error getting legal actions:", err);
    res.status(500).json({ 
      error: "Failed to get legal actions",
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// POST /:gameId/action - Execute a player action
gameActionsRouter.post("/:gameId/action", async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = (req as AuthenticatedRequest).user.uid;
    const { action } = req.body;

    if (!action || typeof action !== "object") {
      res.status(400).json({ error: "Invalid action" });
      return;
    }

    // Load game state to get game type
    const gameState = await dbAdapter.getDocument(`games/${gameId}`);
    if (!gameState) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    const module = backendModules[(gameState as any).gameType];
    if (!module?.handleAction) {
      res.status(400).json({ error: "Game module does not support actions" });
      return;
    }

    const response = await module.handleAction({
      gameId,
      playerId: userId,
      action,
      db: dbAdapter,
    });

    if (response.success) {
      res.json(response);
    } else {
      // Handle stale state specially
      if (response.error === "stale_state") {
        res.status(409).json(response);  // 409 Conflict
      } else {
        res.status(400).json(response);
      }
    }
  } catch (err) {
    console.error("Error handling action:", err);
    res.status(500).json({ 
      error: "Failed to handle action",
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// POST /:gameId/undo - Undo last action
gameActionsRouter.post("/:gameId/undo", async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = (req as AuthenticatedRequest).user.uid;
    const { expectedVersion } = req.body;

    // Load game state to get game type
    const gameState = await dbAdapter.getDocument(`games/${gameId}`);
    if (!gameState) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    const module = backendModules[(gameState as any).gameType];
    if (!module?.undoAction) {
      res.status(400).json({ error: "Game module does not support undo" });
      return;
    }

    const response = await module.undoAction({
      gameId,
      playerId: userId,
      expectedVersion,
      db: dbAdapter,
    });

    if (response.success) {
      res.json(response);
    } else {
      // Handle stale state specially
      if (response.error === "stale_state") {
        res.status(409).json(response);  // 409 Conflict
      } else {
        res.status(400).json(response);
      }
    }
  } catch (err) {
    console.error("Error undoing action:", err);
    res.status(500).json({ 
      error: "Failed to undo action",
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// GET /:gameId/actionLog - Get action history
gameActionsRouter.get("/:gameId/actionLog", async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    // const userId = (req as AuthenticatedRequest).user.uid;
    const limit = parseInt(req.query.limit as string) || 100;

    // Load game state to verify access
    const gameState = await dbAdapter.getDocument(`games/${gameId}`);
    if (!gameState) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    // Query action log from Firestore
    const { db } = await import("../services/database.js");
    const actionLogRef = db.collection(`games/${gameId}/actionLog`);
    const snapshot = await actionLogRef
      .orderBy("sequence", "desc")
      .limit(limit)
      .get();

    const actions = snapshot.docs
      .map(doc => doc.data())
      .reverse(); // Reverse to get chronological order (oldest first)

    res.json({
      actions,
      hasMore: snapshot.docs.length === limit,
    });
  } catch (err) {
    console.error("Error loading action log:", err);
    res.status(500).json({ 
      error: "Failed to load action log",
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// Get legal choices for an action parameter
gameActionsRouter.post("/:gameId/param-choices", async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = (req as AuthenticatedRequest).user.uid;
    const { actionType, paramName, filledParams } = req.body;

    if (!actionType || !paramName) {
      res.status(400).json({ error: "actionType and paramName are required" });
      return;
    }

    // Load game state to get game type
    const gameState = await dbAdapter.getDocument(`games/${gameId}`);
    if (!gameState) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    const module = backendModules[(gameState as any).gameType];
    if (!module?.getParamChoices) {
      res.status(400).json({ error: "Game module does not support param choices" });
      return;
    }

    const response = await module.getParamChoices({
      gameId,
      playerId: userId,
      actionType,
      paramName,
      filledParams: filledParams || {},
      db: dbAdapter,
    });

    res.json(response);
  } catch (err) {
    console.error("Error getting param choices:", err);
    res.status(500).json({
      error: "Failed to get param choices",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});