import { randomUUID } from "crypto";
import { onRequest, type Response } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { buildInitialGameState } from "../../modules/throneworld/functions/throneworldGame.js";

const app = admin.apps.length ? admin.app() : admin.initializeApp();
const db = getFirestore(app);

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

type GameCreator = (params: { gameId: string; playerIds: string[]; scenario?: string }) => unknown;

const GAME_CREATORS: Record<string, GameCreator> = {
  throneworld: ({ gameId, playerIds, scenario }) =>
    buildInitialGameState({ gameId, playerIds, scenario }),
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

export const api = onRequest(async (req, res) => {
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
      ? gameType.trim()
      : "throneworld";

    const creator = GAME_CREATORS[normalizedType];

    if (!creator) {
      res.status(400).json({ error: `Unsupported game type: ${normalizedType}` });
      return;
    }

    const gameId = randomUUID();

    try {
      const state = creator({
        gameId,
        playerIds,
        scenario: typeof scenario === "string" ? scenario : undefined,
      });

      await db.doc(`games/${gameId}/state`).set(state);

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

    const snapshot = await db.doc(`games/${gameId}/state`).get();

    if (!snapshot.exists) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    res.status(200).json(snapshot.data());
    return;
  }

  res.status(404).json({ error: "Not found" });
});
