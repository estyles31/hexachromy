/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import express from "express";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import { getGameModule, seedGameModules } from "./games";

setGlobalOptions({ maxInstances: 10 });

const app = getApps().length ? getApps()[0] : initializeApp();
const db = getFirestore(app);

seedGameModules(db).catch(error => {
  logger.error("Failed to seed game modules", error as Error);
});

const apiApp = express();

apiApp.get("/gameState", async (request, response) => {
  const gameId = (request.query.gameId as string | undefined)?.trim();

  if (!gameId) {
    response.status(400).json({ error: "Missing gameId" });
    return;
  }

  try {
    const gameSnapshot = await db.doc(`games/${gameId}`).get();
    if (!gameSnapshot.exists) {
      response.status(404).json({ error: "Game not found" });
      return;
    }

    const gameData = gameSnapshot.data() ?? {};
    const definitionId = (gameData.gameDefinitionId as string | undefined) ?? "throneworld";

    const definitionSnap = await db.doc(`gameDefinitions/${definitionId}`).get();
    const definitionData = definitionSnap.exists ? definitionSnap.data() : undefined;
    const gameType = (definitionData?.type as string | undefined) ?? definitionId;

    const handler = getGameModule(gameType);
    if (!handler) {
      response.status(404).json({ error: `Unsupported game type: ${gameType}` });
      return;
    }

    const payload = await handler.getGameState({ db, gameId, gameData, definitionData });
    response.json(payload);
  } catch (err) {
    logger.error("Failed to load game", err as Error);
    response.status(500).json({ error: "Failed to load game" });
  }
});

export const api = onRequest(apiApp);
