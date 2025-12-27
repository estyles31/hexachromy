// functions/src/routes/gameActions.ts
import { Router } from "express";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../auth.js";
import { getBackendModule } from "../../../shared-backend/backend.js";
import { dbAdapter } from "../services/database.js";
import { baseActionHandler } from "../actions/ActionHandler.js";
import { BasePhaseManager } from "../../../shared-backend/BasePhaseManager.js";
import { IPhaseManager } from "../../../shared-backend/BackendModuleDefinition.js";
import { GameAction } from "../../../shared/models/GameAction.js";


export const gameActionsRouter = Router();

async function getPhaseManagerForGame(gameId: string): Promise<IPhaseManager> {
  const module = await getBackendModule(gameId, dbAdapter);
  const phaseManager = module?.getPhaseManager(gameId, dbAdapter) ?? new BasePhaseManager(gameId, dbAdapter);
  return phaseManager;
}

// GET /:gameId/actions - Get legal actions for current player
gameActionsRouter.get("/:gameId/actions", async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = (req as AuthenticatedRequest).user.uid;

    const phaseManager = await getPhaseManagerForGame(gameId);

    if (!phaseManager?.getLegalActions) {
      res.status(400).json({ error: "Game module does not support actions" });
      return;
    }

    const response = await phaseManager.getLegalActions(userId);

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
    
    const phaseManager = await getPhaseManagerForGame(gameId);
    const action = await createAction(phaseManager, req.body.action);

    if (!action || typeof action !== "object") {
      res.status(400).json({ error: "Invalid action" });
      return;
    }

    const response = await baseActionHandler({ gameId, playerId: userId, action, db: dbAdapter}, phaseManager);

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

// not handling undo just yet
// POST /:gameId/undo - Undo last action
// gameActionsRouter.post("/:gameId/undo", async (req: Request, res: Response) => {
// });

// GET /:gameId/actionLog - Get action history
gameActionsRouter.get("/:gameId/actionLog", async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    // const userId = (req as AuthenticatedRequest).user.uid;
    const limit = parseInt(req.query.limit as string) || 100;

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

// Get next parameter choices for candidate actions
gameActionsRouter.post("/:gameId/param-choices", async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = (req as AuthenticatedRequest).user.uid;
    const { candidateActions } = req.body;

    if (!candidateActions || !Array.isArray(candidateActions)) {
      res.status(400).json({ error: "candidateActions array is required" });
      return;
    }

    const phaseManager = await getPhaseManagerForGame(gameId);
    const state = await phaseManager.getGameState();

    // Process each candidate action
    const results = [];
    for (const actionData of candidateActions) {
      // Recreate action instance and restore its filled parameters
      const action = await createAction(phaseManager, actionData);
      
      if (!action) {
        continue; // Skip unknown action types
      }

      // Find the next unfilled parameter
      const nextParam = action.params.find(p => 
        !p.optional && (p.value === undefined || p.value === null)
      );

      if (!nextParam) {
        continue; // All params filled, skip
      }

      // Get choices for this parameter
      const choices = action.getParamChoices(state, userId, nextParam.name);

      results.push({
        actionType: action.type,
        nextParam: nextParam.name,
        ...choices
      });
    }

    res.json({ actions: results });
  } catch (err) {
    console.error("Error getting param choices:", err);
    res.status(500).json({
      error: "Failed to get param choices",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// POST /:gameId/finalize-info
gameActionsRouter.post("/:gameId/finalize-info", async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = (req as AuthenticatedRequest).user.uid;

    const phaseManager = await getPhaseManagerForGame(gameId);
    const action = await createAction(phaseManager, req.body.action);

    if (!action) {
      res.status(400).json({ error: "Unknown action type" });
      return;
    }

    const finalize = action.getFinalizeInfo(await phaseManager.getGameState(), userId);
    res.json(finalize);

  } catch (err) {
    console.error("Error getting finalize info:", err);
    res.status(500).json({
      error: "Failed to get finalize info",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

async function createAction(phaseManager: IPhaseManager, action: any): Promise<GameAction | null> {
  const instance = await phaseManager.createAction(action.type);
  if(instance) {
    return Object.assign(instance, action) as GameAction;
  }
  return null;
}