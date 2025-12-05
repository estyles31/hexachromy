import { onRequest } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import type { Request, Response } from "express";

const app = admin.apps.length ? admin.app() : admin.initializeApp();
const db = getFirestore(app);

function applyCors(res: Response) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "GET,OPTIONS");
}

export const api = onRequest(async (req : Request, res : Response) => {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("OK");
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
