import { randomUUID } from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import type { Response, Request } from "express";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { gameModules } from "../../modules/index.js";
import type { GameDatabaseAdapter, GameModuleManifest } from "../../modules/types.js";

const app = admin.apps.length ? admin.app() : admin.initializeApp();
const db = getFirestore(app);

const dbAdapter: GameDatabaseAdapter = {
  async getDocument<T = unknown>(path: string): Promise<T | null> {
    const snapshot = await db.doc(path).get();
    return snapshot.exists ? (snapshot.data() as T) : null;
  },
  async setDocument<T = unknown>(path: string, data: T): Promise<void> {
    await db.doc(path).set(data as Record<string, unknown>);
  },
  async updateDocument(path: string, data: Record<string, unknown>): Promise<void> {
    await db.doc(path).set(data, { merge: true });
  },
  async deleteDocument(path: string): Promise<void> {
    await db.doc(path).delete();
  },
};

function applyCors(res: Response) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

type CreateGameRequest = {
  gameType?: unknown;
  playerIds?: unknown;
  scenario?: unknown;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

function getModule(gameType: string): GameModuleManifest | undefined {
  return gameModules[gameType];
}

export const api = onRequest(async (req : Request, res : Response) => {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("OK");
    return;
  }

  if (req.method === "POST" && req.path === "/games") {
    const { gameType, playerIds, scenario } = (req.body ?? {}) as CreateGameRequest;

    if (!isStringArray(playerIds) || playerIds.length === 0) {
      res.status(400).json({ error: "playerIds must be a non-empty string array" });
      return;
    }

    const normalizedType = typeof gameType === "string" && gameType.trim().length > 0
      ? gameType.trim().toLowerCase()
      : "throneworld";

    const module = getModule(normalizedType);

    if (!module?.backend) {
      res.status(400).json({ error: `Unsupported game type: ${normalizedType}` });
      return;
    }

    const gameId = randomUUID();

    try {
      let createdState: unknown;

      const state = await module.backend.createGame({
        gameId,
        playerIds,
        scenario: typeof scenario === "string" ? scenario : undefined,
        db: dbAdapter,
        returnState: value => {
          createdState = value;
        },
      });

      const resolvedState = createdState ?? state;

      if (!resolvedState) {
        throw new Error("Game module did not return an initial state");
      }

      await dbAdapter.setDocument(`games/${gameId}/state`, resolvedState);

      res.status(200).json({ gameId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create game" });
    }

    return;
  }

  if (req.method === "GET" && req.path.startsWith("/games/")) {
    const [, , maybeId] = req.path.split("/");
    const gameId = maybeId?.trim();

    if (!gameId) {
      res.status(400).json({ error: "Missing gameId" });
      return;
    }

    const state = await dbAdapter.getDocument(`games/${gameId}/state`);

    if (!state) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    res.status(200).json(state);
    return;
  }

  res.status(404).json({ error: "Not found" });
});
