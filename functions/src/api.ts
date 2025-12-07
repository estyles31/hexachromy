import { randomUUID } from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import type { Response, Request } from "express";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { backendModules } from "../../modules/backend.js";
import type { GameDatabaseAdapter } from "../../modules/types.js";
import type { GameSummary, PlayerSummary } from "../../shared/models/GameSummary.js";
import type { PlayerPublicProfile, PlayerPrivateProfile } from "../../shared/models/PlayerProfile.js";
import type { ThroneworldPlayerView } from "../../modules/throneworld/shared/models/GameState.Throneworld.js";
import {
  DEFAULT_THRONEWORLD_DEFINITION,
  type ThroneworldBoardDefinition,
  type ThroneworldGameDefinition,
} from "../../modules/throneworld/shared/models/GameDefinition.Throneworld.js";

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
    params.displayName?.trim() ?? params.email?.split("@")[0] ?? `Player ${params.uid.slice(0, 6)}`;

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

  await Promise.all([publicRef.set(publicProfile), privateRef.set(privateProfile)]);

  return publicProfile;
}

async function getPublicProfile(uid: string): Promise<PlayerPublicProfile | null> {
  const snapshot = await db.doc(`profiles/${uid}`).get();
  return snapshot.exists ? (snapshot.data() as PlayerPublicProfile) : null;
}

async function getDisplayName(uid: string): Promise<string> {
  const profile = await getPublicProfile(uid);
  return profile?.displayName ?? `Player ${uid.slice(0, 6)}`;
}

async function ensureThroneworldDefinition(): Promise<ThroneworldGameDefinition> {
  const docRef = db.doc("gameDefinitions/throneworld");
  const snapshot = await docRef.get();

  if (snapshot.exists) {
    return snapshot.data() as ThroneworldGameDefinition;
  }

  await docRef.set(DEFAULT_THRONEWORLD_DEFINITION);

  return DEFAULT_THRONEWORLD_DEFINITION;
}

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
  boardId?: unknown;
  invitedPlayers?: unknown;
  dummyPlayers?: unknown;
  name?: unknown;
  startScannedForAll?: unknown;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

function normalizePlayerSummaries(value: unknown): PlayerSummary[] {
  if (!Array.isArray(value)) return [];

  return value.map((entry, index) => {
    if (typeof entry === "string") {
      return { id: entry, name: entry, status: "invited" } satisfies PlayerSummary;
    }

    const maybe = entry as Partial<PlayerSummary>;
    const id = typeof maybe.id === "string" ? maybe.id : `player-${index}`;
    const status: PlayerSummary["status"] =
      maybe?.status === "joined" || maybe?.status === "dummy" || maybe?.status === "invited"
        ? maybe.status
        : "invited";

    return {
      id,
      name: typeof maybe.name === "string" ? maybe.name : id,
      status,
    } satisfies PlayerSummary;
  });
}

const backendRegistry = backendModules;

export const api = onRequest({ invoker: "public" }, async (req : Request, res : Response) => {
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

  try {
    await ensurePlayerProfile({
      uid: decoded.uid,
      displayName: typeof decoded.name === "string" ? decoded.name : decoded.email,
      email: decoded.email,
      photoURL: typeof decoded.picture === "string" ? decoded.picture : null,
    });
  } catch (err) {
    console.error("Failed to ensure player profile", err);
    res.status(500).json({ error: "Failed to save player profile" });
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
    const { gameType, playerIds, scenario, boardId, invitedPlayers, dummyPlayers, name, startScannedForAll } =
      (req.body ?? {}) as CreateGameRequest;

    const normalizedType = typeof gameType === "string" && gameType.trim().length > 0
      ? gameType.trim().toLowerCase()
      : "throneworld";

    const module = backendRegistry[normalizedType];

    if (!module?.backend) {
      res.status(400).json({ error: `Unsupported game type: ${normalizedType}` });
      return;
    }

    const hostProfile = await ensurePlayerProfile({
      uid: decoded.uid,
      displayName: typeof decoded.name === "string" ? decoded.name : decoded.email,
      email: decoded.email,
      photoURL: typeof decoded.picture === "string" ? decoded.picture : null,
    });

    const gameId = randomUUID();

    try {
      let createdState: unknown;

      let selectedBoard: ThroneworldBoardDefinition | undefined;
      if (normalizedType === "throneworld") {
        const definition = await ensureThroneworldDefinition();
        const requestedBoardId = typeof boardId === "string" ? boardId : undefined;
        selectedBoard =
          definition.boards.find(board => board.id === requestedBoardId) ??
          definition.boards.find(board => board.id === definition.defaultBoardId) ??
          definition.boards[0];
      }

      const additionalPlayers = isStringArray(playerIds) ? playerIds : [];
      const invitees = isStringArray(invitedPlayers) ? invitedPlayers : [];
      const dummyNames = isStringArray(dummyPlayers) ? dummyPlayers : [];

      const playerSummaries: PlayerSummary[] = [
        { id: decoded.uid, name: hostProfile.displayName, status: "joined" },
      ];

      const inviteIds = Array.from(new Set([...additionalPlayers, ...invitees].filter(id => id !== decoded.uid)));
      const inviteSummaries = await Promise.all(
        inviteIds.map(async inviteId => ({
          id: inviteId,
          name: await getDisplayName(inviteId),
          status: "invited" as const,
        })),
      );
      playerSummaries.push(...inviteSummaries);

      const dummySummaries: PlayerSummary[] = await Promise.all(
        dummyNames.map(async (dummyName, idx) => {
          const dummyId = `dummy-${randomUUID()}`;
          const finalName = dummyName.trim().length > 0 ? dummyName : `Dummy Player ${idx + 1}`;
          await db.doc(`profiles/${dummyId}`).set({
            uid: dummyId,
            displayName: finalName,
            photoURL: null,
            updatedAt: Date.now(),
          });
          return { id: dummyId, name: finalName, status: "dummy" as const } satisfies PlayerSummary;
        }),
      );
      playerSummaries.push(...dummySummaries);

      if (selectedBoard && playerSummaries.length !== selectedBoard.playerCount) {
        res.status(400).json({
          error: `Board ${selectedBoard.name} requires ${selectedBoard.playerCount} players; received ${playerSummaries.length}. Add invites or dummy players to fill the roster.`,
        });
        return;
      }

      if (!selectedBoard && playerSummaries.length === 0) {
        res.status(400).json({ error: "At least one player is required" });
        return;
      }

      const playerIdsForState = playerSummaries.map(player => player.id);
      const statusByPlayer = playerSummaries.reduce<Record<string, PlayerSummary["status"]>>((acc, player) => {
        acc[player.id] = player.status;
        return acc;
      }, {});

      const scenarioToUse =
        (selectedBoard?.scenario ?? (typeof scenario === "string" ? scenario : undefined)) ??
        `${playerIdsForState.length}p`;

      const state = await module.backend.createGame({
        gameId,
        playerIds: playerIdsForState,
        scenario: scenarioToUse,
        db: dbAdapter,
        options: {
          playerStatuses: statusByPlayer,
          boardId: selectedBoard?.id,
          startScannedForAll: Boolean(startScannedForAll),
          name: typeof name === "string" ? name : undefined,
        },
        returnState: value => {
          createdState = value;
        },
      });

      const resolvedState = createdState ?? state;

      if (!resolvedState) {
        throw new Error("Game module did not return an initial state");
      }

      const everyoneReady = playerSummaries.every(player => player.status === "joined" || player.status === "dummy");

      const summary: GameSummary = {
        id: gameId,
        name:
          typeof (resolvedState as { name?: unknown })?.name === "string"
            ? (resolvedState as { name: string }).name
            : typeof name === "string" && name.trim().length > 0
              ? name.trim()
              : `Game ${gameId}`,
        players: playerSummaries,
        status: everyoneReady ? "in-progress" : "waiting",
        gameType: normalizedType,
        boardId: selectedBoard?.id,
        options: {
          startScannedForAll: Boolean(startScannedForAll),
        },
      };

      await Promise.all([
        dbAdapter.setDocument(`games/${gameId}`, resolvedState),
        dbAdapter.setDocument(`gameSummaries/${gameId}`, summary),
      ]);

      res.status(200).json({ gameId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create game" });
    }

    return;
  }

  if (req.method === "GET" && path === "/game-definitions/throneworld") {
    const definition = await ensureThroneworldDefinition();
    res.status(200).json(definition);
    return;
  }

  if (req.method === "POST" && /\/games\/.+\/join$/.test(path)) {
    const [, , gameId] = path.split("/");

    if (!gameId) {
      res.status(400).json({ error: "Missing gameId" });
      return;
    }

    try {
      await ensurePlayerProfile({
        uid: decoded.uid,
        displayName: typeof decoded.name === "string" ? decoded.name : decoded.email,
        email: decoded.email,
        photoURL: typeof decoded.picture === "string" ? decoded.picture : null,
      });

      const summaryRef = db.doc(`gameSummaries/${gameId}`);
      const gameRef = db.doc(`games/${gameId}`);

      await db.runTransaction(async transaction => {
        const [summarySnap, gameSnap] = await transaction.getAll(summaryRef, gameRef);

        if (!summarySnap.exists || !gameSnap.exists) {
          throw new Error("Game not found");
        }

        const summaryData = summarySnap.data() as Partial<GameSummary>;
        const normalizedPlayers = normalizePlayerSummaries(summaryData.players);

        const playerIndex = normalizedPlayers.findIndex(player => player.id === decoded.uid);

        if (playerIndex < 0) {
          throw new Error("Player is not invited to this game");
        }

        normalizedPlayers[playerIndex] = { ...normalizedPlayers[playerIndex], status: "joined" };

        const updatedStatus = normalizedPlayers.every(player => player.status === "joined" || player.status === "dummy")
          ? "in-progress"
          : "waiting";

        const stateData = gameSnap.data() as { playerStatuses?: Record<string, string>; status?: string };
        const updatedPlayerStatuses = {
          ...(stateData.playerStatuses ?? {}),
          [decoded.uid]: "joined",
        } as Record<string, string>;

        transaction.set(
          summaryRef,
          { players: normalizedPlayers, status: updatedStatus },
          { merge: true },
        );
        transaction.set(
          gameRef,
          { playerStatuses: updatedPlayerStatuses, status: updatedStatus },
          { merge: true },
        );
      });

      res.status(200).json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err instanceof Error ? err.message : "Failed to join game" });
    }

    return;
  }

  if (req.method === "GET" && path === "/games") {
    try {
      const snapshot = await db.collection("gameSummaries").get();

      const games: GameSummary[] = snapshot.docs.map(doc => {
        const data = doc.data() as Partial<GameSummary>;

        const players = normalizePlayerSummaries(data.players);

        return {
          id: data.id ?? doc.id,
          name: data.name ?? `Game ${doc.id}`,
          players,
          status:
            data?.status === "completed" || data?.status === "in-progress" || data?.status === "waiting"
              ? data.status
              : "waiting",
          gameType: data.gameType ?? "unknown",
          boardId: data.boardId,
          options: typeof data.options === "object" && data.options
            ? { startScannedForAll: Boolean((data.options as { startScannedForAll?: unknown }).startScannedForAll) }
            : undefined,
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

    const state = await dbAdapter.getDocument(`games/${gameId}`);

    if (!state) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    if ((state as { gameType?: unknown }).gameType === "throneworld") {
      const playerView =
        (await dbAdapter.getDocument<ThroneworldPlayerView>(`games/${gameId}/playerViews/${decoded.uid}`)) ??
        { playerId: decoded.uid, systems: {} };

      res.status(200).json({ ...state, playerView });
      return;
    }

    res.status(200).json(state);
    return;
  }

  res.status(404).json({ error: "Not found" });
});
