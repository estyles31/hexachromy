// functions/src/routes/gameDefinitions.ts
import { Router } from "express";
import type { Request, Response } from "express";
import { backendModules } from "../../../modules/backend.js";
import type { GameDefinition } from "../../../shared/models/GameDefinition.js";

export const gameDefinitionsRouter = Router();

// GET /game-definitions - List all available game types
gameDefinitionsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const defs: GameDefinition[] = [];
    
    for (const key of Object.keys(backendModules)) {
      const def = backendModules[key].getGameDefinition();
      if (def) {
        defs.push(def);
      }
    }
    
    res.json(defs);
  } catch (err) {
    console.error("Error loading game definitions:", err);
    res.status(500).json({ error: "Failed to load game definitions" });
  }
});

// GET /game-definitions/:gameType - Get specific game definition
gameDefinitionsRouter.get("/:gameType", async (req: Request, res: Response) => {
  try {
    const { gameType } = req.params;
    
    const module = backendModules[gameType];
    if (!module) {
      res.status(404).json({ error: `Game type not found: ${gameType}` });
      return;
    }
    
    const def = module.getGameDefinition();
    if (!def) {
      res.status(404).json({ error: "Game definition not found" });
      return;
    }
    
    res.json(def);
  } catch (err) {
    console.error("Error loading game definition:", err);
    res.status(500).json({ error: "Failed to load game definition" });
  }
});