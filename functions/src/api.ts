import { randomUUID } from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import type { Response, Request } from "express";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { backendModules } from "../../modules/backend.js";
import type { GameDatabaseAdapter } from "../../modules/types.js";
import type { GameSummary } from "../../shared/models/GameSummary.js";

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
  res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function getBearerToken(req: Request): string | null {
  const authorization = typeof req.headers.authorization === "string"
    ? req.headers.authorization
    : Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : null;

  if (!authorization) return null;

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function getAuthErrorDetails(err: unknown): {
  name: string | null;
  code: string | null;
  message: string | null;
} {
  if (!err || typeof err !== "object") {
    return { name: null, code: null, message: null };
  }

  const { name } = err as { name?: unknown };
  const directCode = (err as { code?: unknown })?.code;
  const directMessage = (err as { message?: unknown })?.message;
  const errorInfo = (err as { errorInfo?: { code?: unknown; message?: unknown } }).errorInfo;

  return {
    name: typeof name === "string" ? name : null,
    code:
      typeof directCode === "string"
        ? directCode
        : typeof errorInfo?.code === "string"
          ? errorInfo.code
          : null,
    message:
      typeof directMessage === "string"
        ? directMessage
        : typeof errorInfo?.message === "string"
          ? errorInfo.message
          : null,
  };
}

type CreateGameRequest = {
  gameType?: unknown;
  playerIds?: unknown;
  scenario?: unknown;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

const backendRegistry = backendModules;

export const api = onRequest(async (req : Request, res : Response) => {
  applyCors(res);

  const rawPath = req.path ?? new URL(req.url ?? "/", "http://localhost").pathname;
  const path = rawPath.replace(/^\/api\b/, "") || "/";

  console.info("[api] incoming request", {
    method: req.method,
    path,
    rawPath,
    origin: req.headers.origin,
    userAgent: req.headers["user-agent"],
  });

  if (req.method === "OPTIONS") {
    res.status(204).send("OK");
    return;
  }

  const token = getBearerToken(req);

  if (!token) {
    console.warn("[api] missing bearer token", {
      method: req.method,
      path,
      hasAuthHeader: Boolean(req.headers.authorization),
    });
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  console.info("[api] received authorization header", {
    method: req.method,
    path,
    authorizationPreview: `${token.slice(0, 12)}...`,
  });

  let decoded: admin.auth.DecodedIdToken;

  try {
    decoded = await admin.auth().verifyIdToken(token);

    console.info("[api] authenticated request", {
      method: req.method,
      path,
      uid: decoded.uid,
      email: decoded.email,
    });
  } catch (err) {
    const authErrorDetails = getAuthErrorDetails(err);

    console.error("[api] failed to verify auth token", {
      method: req.method,
      path,
      error: authErrorDetails,
      raw: err,
    });

    res.status(401).json({
      error: "Invalid authentication token",
      reason: authErrorDetails.code ?? authErrorDetails.name ?? null,
      message: authErrorDetails.message,
    });
    return;
  }

  if (req.method === "GET" && path === "/debug/auth") {
    res.status(200).json({
      uid: decoded.uid,
      email: decoded.email ?? null,
      authTime: decoded.auth_time ?? null,
      issuedAt: decoded.iat ?? null,
      expiresAt: decoded.exp ?? null,
      hasAuthorizationHeader: Boolean(req.headers.authorization),
      authorizationPreview: `${token.slice(0, 12)}...`,
    });
    return;
  }

  if (req.method === "POST" && path === "/games") {
    const { gameType, playerIds, scenario } = (req.body ?? {}) as CreateGameRequest;

    if (!isStringArray(playerIds) || playerIds.length === 0) {
      res.status(400).json({ error: "playerIds must be a non-empty string array" });
      return;
    }

    const normalizedType = typeof gameType === "string" && gameType.trim().length > 0
      ? gameType.trim().toLowerCase()
      : "throneworld";

    const module = backendRegistry[normalizedType];

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

      const summary: GameSummary = {
        id: gameId,
        name:
          typeof (resolvedState as { name?: unknown })?.name === "string"
            ? (resolvedState as { name: string }).name
            : `Game ${gameId}`,
        players: isStringArray(playerIds) ? playerIds : [],
        status: "waiting",
        gameType: normalizedType,
      };

      await Promise.all([
        dbAdapter.setDocument(`games/${gameId}/state`, resolvedState),
        dbAdapter.setDocument(`gameSummaries/${gameId}`, summary),
      ]);

      res.status(200).json({ gameId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create game" });
    }

    return;
  }

  if (req.method === "GET" && path === "/games") {
    try {
      const snapshot = await db.collection("gameSummaries").get();

      const games: GameSummary[] = snapshot.docs.map(doc => {
        const data = doc.data() as Partial<GameSummary>;

        return {
          id: data.id ?? doc.id,
          name: data.name ?? `Game ${doc.id}`,
          players: Array.isArray(data.players) ? data.players.map(String) : [],
          status:
            data?.status === "completed" || data?.status === "in-progress" || data?.status === "waiting"
              ? data.status
              : "waiting",
          gameType: data.gameType ?? "unknown",
        } satisfies GameSummary;
      });

      res.status(200).json(games);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load games" });
    }

    return;
  }

  if (req.method === "GET" && path.startsWith("/games/")) {
    const [, , maybeId] = path.split("/");
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
