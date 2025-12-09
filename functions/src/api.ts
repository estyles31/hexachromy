import { randomUUID } from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

import { backendModules } from "../../modules/backend.js";
import type { GameDatabaseAdapter } from "../../modules/types.js";
import type { GameSummary, PlayerSummary } from "../../shared/models/GameSummary.js";
import type { GameDefinition } from "../../shared/models/GameDefinition.js";
import type { PlayerPublicProfile, PlayerPrivateProfile } from "../../shared/models/PlayerProfile.js";

const app = admin.apps.length ? admin.app() : admin.initializeApp();
const db = getFirestore(app);

/* ------------------------------------------------------------------ */
/* Database adapter                                                    */
/* ------------------------------------------------------------------ */

const dbAdapter: GameDatabaseAdapter = {
  async getDocument<T = unknown>(path: string): Promise<T | null> {
    const snap = await db.doc(path).get();
    return snap.exists ? (snap.data() as T) : null;
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

/* ------------------------------------------------------------------ */
/* Profiles                                                           */
/* ------------------------------------------------------------------ */

async function ensurePlayerProfile(params: {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}): Promise<PlayerPublicProfile> {
  const now = Date.now();
  const publicRef = db.doc(`profiles/${params.uid}`);
  const privateRef = db.doc(`profiles/${params.uid}/private/data`);

  const existing = await publicRef.get();
  if (existing.exists) {
    return existing.data() as PlayerPublicProfile;
  }

  const displayName =
    params.displayName?.trim()
    ?? params.email?.split("@")[0]
    ?? `Player ${params.uid.slice(0, 6)}`;

  const publicProfile: PlayerPublicProfile = {
    uid: params.uid,
    displayName,
    photoURL: params.photoURL ?? null,
    updatedAt: now,
  };

  const privateProfile: PlayerPrivateProfile = {
    uid: params.uid,
    email: params.email ?? null,
    updatedAt: now,
  };

  await Promise.all([
    publicRef.set(publicProfile),
    privateRef.set(privateProfile),
  ]);

  return publicProfile;
}


export function buildPlayerSummaries(params: {
  players: Array<{
    uid: string;
    displayName: string;
    status: "invited" | "joined" | "dummy";
    race?: string;
  }>;
}): PlayerSummary[] {
  return params.players.map(p => ({
    id: p.uid,
    name: p.displayName,
    status: p.status,
    race: p.race,
  }));
}


/* ------------------------------------------------------------------ */
/* Game definitions                                                    */
/* ------------------------------------------------------------------ */

async function getAllGameDefinitions(): Promise<GameDefinition[]> {
  const defs: GameDefinition[] = [];
  for (const key of Object.keys(backendModules)) {
    const def = backendModules[key].getGameDefinition();
    if (def) defs.push(def);
  }
  return defs;
}

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

/* ------------------------------------------------------------------ */
/* API                                                                */
/* ------------------------------------------------------------------ */

export const api = onRequest({ invoker: "public" }, async (req: Request, res: Response) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(token);
  } catch {
    res.status(401).json({ error: "Invalid authentication token" });
    return;
  }

  await ensurePlayerProfile({
    uid: decoded.uid,
    displayName: decoded.name ?? decoded.email,
    email: decoded.email,
    photoURL: decoded.picture,
  });

  const path = (req.path || "/").replace(/^\/api/, "");

  /* ------------------ Game definitions ------------------ */

  if (req.method === "GET" && path === "/game-definitions") {
    res.json(await getAllGameDefinitions());
    return;
  }

  if (req.method === "GET" && path.startsWith("/game-definitions/")) {
    const gameType = path.split("/")[2];
    const def = backendModules[gameType].getGameDefinition();
    if (!def) {
      res.status(404).json({ error: "Game definition not found" });
      return;
    }
    res.json(def);
    return;
  }

  /* ------------------ Create game ------------------ */

  if (req.method === "POST" && path === "/games") {
    const { gameType, scenarioId, options, players, name } = req.body ?? {};

    if (typeof gameType !== "string") {
      res.status(400).json({ error: "Missing gameType" });
      return;
    }

    const module = backendModules[gameType];
    if (!module) {
      res.status(400).json({ error: `Unsupported game type: ${gameType}` });
      return;
    }

    const gameId = randomUUID();

    const state = await module.createGame({
      gameType,
      gameId,
      scenario: { id: scenarioId, playerCount: players.count },
      options,
      players,
      name,
      db: dbAdapter,
    });

    const summary: GameSummary = {
      id: gameId,
      name:
        typeof (state as any).name === "string"
          ? (state as any).name
          : name?.trim() || `Game ${gameId}`,

      gameType: gameType,

      players: buildPlayerSummaries(players),

      status:
        typeof (state as any).status === "string"
          ? (state as any).status
          : "waiting",

      options:
        typeof (state as any).options === "object"
          ? (state as any).options
          : undefined,

      boardId:
        typeof (state as any).boardId === "string"
          ? (state as any).boardId
          : undefined,
    };


    await Promise.all([
      dbAdapter.setDocument(`games/${gameId}`, state),
      dbAdapter.setDocument(`gameSummaries/${gameId}`, summary),
    ]);

    res.json({ gameId });
    return;
  }

  /* ------------------ List games ------------------ */

  if (req.method === "GET" && path === "/games") {
    const snap = await db.collection("gameSummaries").get();
    const games = snap.docs.map(d => d.data() as GameSummary);
    res.json(games);
    return;
  }

  /* ------------------ Load game ------------------ */

  if (req.method === "GET" && path.startsWith("/games/")) {
    const gameId = path.split("/")[2];
    const state = await dbAdapter.getDocument(`games/${gameId}`);
    if (!state) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    const module = backendModules[(state as any).gameType];
    const rawExtra =
      module?.getPlayerView
        ? await module.getPlayerView({ gameId, playerId: decoded.uid, db: dbAdapter })
        : null;

    const extra =
      rawExtra && typeof rawExtra === "object" ? rawExtra : {};

    res.json({ ...state, ...extra });
    return;
  }

  res.status(404).json({ error: "Not found" });
});
