// functions/src/routes/games.ts
import { Router } from "express";
import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db, dbAdapter } from "../services/database.js";
import { buildPlayerSummaries } from "../services/profiles.js";
import { backendModules } from "../../../shared-backend/backend.js";
import type { GameSummary } from "../../../shared/models/GameSummary.js";
import type { AuthenticatedRequest } from "../auth.js";
import { gameActionsRouter } from "./gameActions.js";

export const gamesRouter = Router();

gamesRouter.use("/", gameActionsRouter);

// POST /games - Create a new game
gamesRouter.post("/", async (req: Request, res: Response) => {
  try {
    if(process.env.DEBUG === "true") {
      console.log("POST /games body:", JSON.stringify(req.body, null, 2));
    }

    const { gameType, scenarioId, playerSlots = [], options = {}, name } = req.body ?? {};

    // Validate gameType
    if (typeof gameType !== "string" || !gameType.trim()) {
      res.status(400).json({ error: "Missing or invalid gameType" });
      return;
    }

    // Check if module exists
    const module = backendModules[gameType];
    if (!module) {
      res.status(400).json({ error: `Unsupported game type: ${gameType}` });
      return;
    }

    // Get game definition to validate scenario
    const gameDef = module.getGameDefinition();
    if (!gameDef) {
      res.status(500).json({ error: "Game definition not available" });
      return;
    }

    // Validate and get scenario
    const scenario = gameDef.scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
      res.status(400).json({ 
        error: `Invalid scenario: ${scenarioId}`,
        availableScenarios: gameDef.scenarios.map(s => s.id)
      });
      return;
    }

    // Validate playerSlots array
    if (!Array.isArray(playerSlots) || playerSlots.length === 0) {
      res.status(400).json({ error: "At least one player slot is required" });
      return;
    }

    // Validate player slot count matches scenario
    const requiredPlayerCount = scenario.playerCount?.value ?? scenario.playerCount;
    if (playerSlots.length !== requiredPlayerCount) {
      res.status(400).json({ 
        error: `Scenario requires exactly ${requiredPlayerCount} player slots, got ${playerSlots.length}` 
      });
      return;
    }

    // Validate each player slot has proper structure
    for (let i = 0; i < playerSlots.length; i++) {
      const slot = playerSlots[i];
      if (!slot.type || !["human", "bot", "open"].includes(slot.type)) {
        res.status(400).json({ 
          error: `Invalid player slot type at index ${i}: ${slot.type}` 
        });
        return;
      }
      
      if (slot.type === "human" && (!slot.uid || !slot.displayName)) {
        res.status(400).json({ 
          error: `Human player slot at index ${i} missing uid or displayName` 
        });
        return;
      }
      
      if (slot.type === "bot" && (!slot.botId || !slot.displayName)) {
        res.status(400).json({ 
          error: `Bot player slot at index ${i} missing botId or displayName` 
        });
        return;
      }
    }

    const gameId = randomUUID();

    // Build GameStartContext
    const gameStartContext = {
      gameId,
      gameType,
      scenario: {
        id: scenarioId,
        playerCount: requiredPlayerCount,
      },
      playerSlots: playerSlots.map((slot: any, index: number) => ({
        ...slot,
        slotIndex: index,
      })),
      options: options || {},
      name: name?.trim() || undefined,
      db: dbAdapter,
    };

    // Create game state via module - this handles persistence internally
    const state = await module.createGame(gameStartContext);
    if(process.env.DEBUG == "true") {
      console.log("new game state: ", JSON.stringify(state));
    }

    state.playerViews = undefined;  //erase playerviews if they exist
    await dbAdapter.setDocument(`games/${gameId}`, state);

    // Count filled slots for summary
    const filledSlots = playerSlots.filter((s: any) => s.type !== "open");

    // Build game summary for listing
    const summary: GameSummary = {
      id: gameId,
      name: (state as any).name || name?.trim() || `Game ${gameId}`,
      gameType: gameType,
      players: buildPlayerSummaries({ 
        players: filledSlots.map((slot: any) => ({
          uid: slot.type === "human" ? slot.uid : slot.botId,
          displayName: slot.displayName,
          status: slot.type === "bot" ? "dummy" : "joined",
          race: (state as any).players?.[slot.uid || slot.botId]?.race,
        }))
      }),
      status: (state as any).status || "waiting",
      options: (state as any).options || undefined,
    };

    await dbAdapter.setDocument(`gameSummaries/${gameId}`, summary);

    res.json({ gameId });
  } catch (err) {
    console.error("Error creating game:", err);
    res.status(500).json({ 
      error: "Failed to create game",
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// GET /games - List all games
gamesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const snap = await db.collection("gameSummaries").get();
    const games = snap.docs.map(d => d.data() as GameSummary);
    res.json(games);
  } catch (err) {
    console.error("Error listing games:", err);
    res.status(500).json({ error: "Failed to list games" });
  }
});

// GET /games/:gameId - Load specific game
gamesRouter.get("/:gameId", async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = (req as AuthenticatedRequest).user.uid;

    // Load game state
    const state = await dbAdapter.getDocument(`games/${gameId}`);
    if (!state) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    // Get player-specific view if module provides it
    const module = backendModules[(state as any).gameType];
    const rawExtra =
      module?.getPlayerViews
        ? await module.getPlayerViews({ gameId, playerId: userId, db: dbAdapter })
        : null;

    const extra =
      rawExtra && typeof rawExtra === "object" ? rawExtra : {};

    res.json({ ...state, ...extra });
  } catch (err) {
    console.error("Error loading game:", err);
    res.status(500).json({ error: "Failed to load game" });
  }
});