// /functions/src/routes/gameActions.ts
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

// POST /:gameId/legal-actions - Get legal actions with optional filled params
gameActionsRouter.post("/:gameId/legal-actions", async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = (req as AuthenticatedRequest).user.uid;
    const { filledParams } = req.body as { filledParams?: Record<string, string> };

    const phaseManager = await getPhaseManagerForGame(gameId);

    if (!phaseManager?.getLegalActions) {
      res.status(400).json({ error: "Game module does not support actions" });
      return;
    }

    const response = await phaseManager.getLegalActions(userId, filledParams);
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

    const response = await baseActionHandler(
      { gameId, playerId: userId, action, db: dbAdapter },
      phaseManager
    );

    if (response.success) {
      res.json(response);
    } else {
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

// GET /:gameId/actionLog - Get action history
gameActionsRouter.get("/:gameId/actionLog", async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const { db } = await import("../services/database.js");
    const actionLogRef = db.collection(`games/${gameId}/actionLog`);
    const snapshot = await actionLogRef
      .orderBy("sequence", "desc")
      .limit(limit)
      .get();

    const actions = snapshot.docs.map(doc => doc.data()).reverse();

    res.json({ actions, hasMore: snapshot.docs.length === limit });
  } catch (err) {
    console.error("Error loading action log:", err);
    res.status(500).json({
      error: "Failed to load action log",
      details: err instanceof Error ? err.message : String(err)
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
  if (instance) {
    return Object.assign(instance, action) as GameAction;
  }
  return null;
}