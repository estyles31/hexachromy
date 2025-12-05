import { randomUUID } from "crypto";
import { onRequest, type Response } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { buildInitialGameState } from "./throneworldGame.js";

const app = admin.apps.length ? admin.app() : admin.initializeApp();
const db = getFirestore(app);

type RequestBody = {
  playerIds?: unknown;
  scenario?: unknown;
};

function applyCors(res: Response) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

export const throneworld = onRequest(async (req, res) => {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("OK");
    return;
  }

  if (req.method === "POST" && req.path === "/createGame") {
    const { playerIds, scenario } = (req.body ?? {}) as RequestBody;

    if (!Array.isArray(playerIds) || playerIds.length === 0 || !playerIds.every(p => typeof p === "string")) {
      res.status(400).json({ error: "playerIds must be a non-empty string array" });
      return;
    }

    const normalizedScenario = typeof scenario === "string" && scenario.trim().length > 0
      ? scenario
      : "6p";

    const gameId = randomUUID();

    try {
      const gameState = buildInitialGameState({
        gameId,
        playerIds,
        scenario: normalizedScenario,
      });

      await db.doc(`games/${gameId}/state`).set(gameState);

      res.status(200).json({ gameId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create game" });
    }

    return;
  }

  if (req.method === "GET" && req.path.startsWith("/state/")) {
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
