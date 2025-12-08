import { randomUUID } from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import type { Response, Request } from "express";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { backendModules } from "../../modules/backend.js";
import type { GameBackendRegistration, GameDatabaseAdapter } from "../../modules/types.js";
import type { GameSummary, PlayerSummary } from "../../shared/models/GameSummary.js";
import type { PlayerPublicProfile, PlayerPrivateProfile } from "../../shared/models/PlayerProfile.js";
import type {
  GameDefinition,
  GameDefinitionOption,
  GameDefinitionSelectOption,
} from "../../shared/models/GameDefinition.js";

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

async function getBotProfiles(limit: number): Promise<PlayerPublicProfile[]> {
  const snapshot = await db.collection("profiles").where("isBot", "==", true).limit(limit).get();
  return snapshot.docs.map(doc => doc.data() as PlayerPublicProfile);
}

async function ensureBotProfiles(count: number): Promise<PlayerPublicProfile[]> {
  const existing = await getBotProfiles(count);

  if (existing.length >= count) {
    return existing.slice(0, count);
  }

  const needed = count - existing.length;
  const created: PlayerPublicProfile[] = [];

  for (let i = 0; i < needed; i += 1) {
    const id = `bot-${randomUUID()}`;
    const displayName = `Bot ${existing.length + i + 1}`;
    const profile: PlayerPublicProfile & { isBot: boolean } = {
      uid: id,
      displayName,
      photoURL: null,
      updatedAt: Date.now(),
      isBot: true,
    };

    await db.doc(`profiles/${id}`).set(profile);
    created.push(profile);
  }

  return [...existing, ...created];
}

async function ensureGameDefinition(gameType: string): Promise<GameDefinition | null> {
  const module: GameBackendRegistration | undefined = backendRegistry[gameType];

  if (module?.api?.ensureGameDefinition) {
    return module.api.ensureGameDefinition({ db: dbAdapter });
  }

  return dbAdapter.getDocument<GameDefinition>(`gameDefinitions/${gameType}`);
}

async function ensureSupportedGameDefinitions(): Promise<GameDefinition[]> {
  const definitions: GameDefinition[] = [];
  const supportedTypes = Object.keys(backendRegistry);

  for (const gameType of supportedTypes) {
    const definition = await ensureGameDefinition(gameType);
    if (definition) {
      definitions.push(definition);
    }
  }

  return definitions;
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
  name?: unknown;
  startScannedForAll?: unknown;
  options?: unknown;
  playerSlots?: unknown;
  fillWithBots?: unknown;
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
      race: typeof maybe.race === "string" ? maybe.race : undefined,
    } satisfies PlayerSummary;
  });
}

function hasCanonicalPlayers(
  state: unknown,
): state is { players: Record<string, { id: string; name?: string; status?: string; race?: string }> } {
  return Boolean(
    state &&
      typeof (state as { players?: unknown }).players === "object" &&
      !Array.isArray((state as { players?: unknown }).players),
  );
}

function extractPlayersFromState(state: unknown): PlayerSummary[] {
  if (hasCanonicalPlayers(state)) {
    const players = (state as { players: Record<string, { id: string; name?: string; status?: string; race?: string }> })
      .players;
    return Object.values(players).map(player => ({
      id: player.id,
      name: typeof player.name === "string" ? player.name : player.id,
      status:
        player.status === "joined" || player.status === "dummy" || player.status === "invited"
          ? (player.status as PlayerSummary["status"])
          : "invited",
      race: typeof player.race === "string" ? player.race : undefined,
    }));
  }

  return normalizePlayerSummaries((state as { summaryPlayers?: unknown }).summaryPlayers);
}

function isSelectOption(option: GameDefinitionOption): option is GameDefinitionSelectOption {
  return option?.type === "select" && Array.isArray((option as GameDefinitionSelectOption).choices);
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
    const {
      gameType,
      playerIds,
      scenario,
      boardId,
      invitedPlayers,
      name,
      options,
      playerSlots,
      fillWithBots,
    } = (req.body ?? {}) as CreateGameRequest;

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

      const creationOptions =
        options && typeof options === "object" && !Array.isArray(options)
          ? (options as Record<string, unknown>)
          : {};

      const definition = await ensureGameDefinition(normalizedType);

      const boardOption = definition?.options?.find(option => option.id === "boardId" && isSelectOption(option)) as
        | GameDefinitionSelectOption
        | undefined;

      const resolvedBoardId =
        typeof creationOptions.boardId === "string"
          ? creationOptions.boardId
          : typeof boardId === "string"
            ? boardId
            : typeof boardOption?.defaultValue === "string"
              ? boardOption.defaultValue
              : boardOption?.choices?.[0]?.value;

      let requiredPlayers: number | undefined;
      let definitionScenario: string | undefined;

      const boardChoice = boardOption?.choices?.find(choice => choice.value === resolvedBoardId);
      if (boardChoice?.metadata) {
        const { playerCount, scenario: choiceScenario } = boardChoice.metadata as {
          playerCount?: unknown;
          scenario?: unknown;
        };
        if (typeof playerCount === "number") {
          requiredPlayers = playerCount;
        }
        if (typeof choiceScenario === "string") {
          definitionScenario = choiceScenario;
        }
      }

      const slotEntries = Array.isArray(playerSlots) ? playerSlots : [];
      const normalizedSlots = slotEntries.map(slot =>
        typeof slot === "string" && slot.trim().length > 0 ? slot.trim() : null,
      );
      const additionalPlayers = isStringArray(playerIds) ? playerIds : [];
      const invitees = isStringArray(invitedPlayers) ? invitedPlayers : [];
      const requestedSlots = normalizedSlots.length
        ? normalizedSlots
        : requiredPlayers
          ? Array.from({ length: requiredPlayers }, () => null)
          : [];

      let playerSummaries: PlayerSummary[] = [
        { id: decoded.uid, name: hostProfile.displayName, status: "joined" },
      ];

      requestedSlots.forEach((value, index) => {
        if (index === 0) return;
        if (typeof value === "string" && value !== decoded.uid) {
          playerSummaries.push({ id: value, name: value, status: "invited" });
        }
      });

      const inviteIds = Array.from(new Set([...additionalPlayers, ...invitees].filter(id => id !== decoded.uid)));
      const inviteSummaries = await Promise.all(
        inviteIds.map(async inviteId => ({
          id: inviteId,
          name: await getDisplayName(inviteId),
          status: "invited" as const,
        })),
      );
      playerSummaries.push(...inviteSummaries);

      const uniquePlayers = new Map<string, PlayerSummary>();
      playerSummaries.forEach(player => {
        if (!uniquePlayers.has(player.id)) {
          uniquePlayers.set(player.id, player);
        }
      });
      playerSummaries = Array.from(uniquePlayers.values());

      if (requiredPlayers && playerSummaries.length > requiredPlayers) {
        res.status(400).json({
          error: `Board allows ${requiredPlayers} players; received ${playerSummaries.length}. Remove extra invites.`,
        });
        return;
      }

      const shouldFillWithBots = Boolean(fillWithBots);
      if (shouldFillWithBots && requiredPlayers && playerSummaries.length < requiredPlayers) {
        const neededBots = requiredPlayers - playerSummaries.length;
        const bots = await ensureBotProfiles(neededBots);
        playerSummaries.push(
          ...bots.map((bot, index) => ({
            id: bot.uid,
            name: bot.displayName ?? `Bot ${index + 1}`,
            status: "dummy" as const,
          })),
        );
      }

      const modulePreparation = module.api?.prepareCreateGame
        ? await module.api.prepareCreateGame({
          definition: definition ?? null,
          requestBody: (req.body ?? {}) as Record<string, unknown>,
          creationOptions,
          players: playerSummaries,
          resolvedBoardId: typeof resolvedBoardId === "string" ? resolvedBoardId : undefined,
          defaultScenario: definitionScenario,
        })
        : undefined;

      if (Array.isArray(modulePreparation?.players)) {
        playerSummaries = modulePreparation.players;
      }

      requiredPlayers = modulePreparation?.requiredPlayers ?? requiredPlayers;

      if (!requiredPlayers && playerSummaries.length === 0) {
        res.status(400).json({ error: "At least one player is required" });
        return;
      }

      const playerIdsForState = playerSummaries.map(player => player.id);
      const statusByPlayer = playerSummaries.reduce<Record<string, PlayerSummary["status"]>>((acc, player) => {
        acc[player.id] = player.status;
        return acc;
      }, {});

      const scenarioToUse =
        modulePreparation?.scenario ??
        definitionScenario ??
        (typeof scenario === "string" ? scenario : undefined) ??
        `${playerIdsForState.length}p`;

      const backendOptions: Record<string, unknown> = {
        ...creationOptions,
        ...(modulePreparation?.options ?? {}),
        playerStatuses: statusByPlayer,
        name: typeof name === "string" ? name : undefined,
        playerSummaries,
        requiredPlayers,
      };

      const boardIdForSummary =
        typeof backendOptions.boardId === "string"
          ? backendOptions.boardId
          : typeof resolvedBoardId === "string"
            ? resolvedBoardId
            : undefined;

      const state = await module.backend.createGame({
        gameId,
        playerIds: playerIdsForState,
        scenario: scenarioToUse,
        db: dbAdapter,
        options: backendOptions,
        returnState: (value: unknown) => {
          createdState = value;
        },
      });

      const resolvedState = createdState ?? state;

      if (!resolvedState) {
        throw new Error("Game module did not return an initial state");
      }

      const resolvedOptions = (resolvedState as { options?: Record<string, unknown> })?.options ?? {};
      const resolvedRequiredPlayers =
        typeof resolvedOptions.requiredPlayers === "number"
          ? (resolvedOptions.requiredPlayers as number)
          : requiredPlayers;
      if (typeof resolvedRequiredPlayers === "number" && resolvedRequiredPlayers > 0) {
        resolvedOptions.requiredPlayers = resolvedRequiredPlayers;
      }

      const providedPlayers = extractPlayersFromState(resolvedState);

      const players = providedPlayers.length > 0 ? providedPlayers : playerSummaries;

      const enoughPlayers =
        typeof resolvedRequiredPlayers === "number" ? players.length >= resolvedRequiredPlayers : players.length > 0;
      const everyoneReady =
        enoughPlayers && players.every(player => player.status === "joined" || player.status === "dummy");

      const summary: GameSummary = {
        id: gameId,
        name:
          typeof (resolvedState as { name?: unknown })?.name === "string"
            ? (resolvedState as { name: string }).name
            : typeof name === "string" && name.trim().length > 0
              ? name.trim()
              : `Game ${gameId}`,
        players,
        status: everyoneReady ? "in-progress" : "waiting",
        gameType: normalizedType,
        boardId: boardIdForSummary,
        options: typeof resolvedOptions === "object" ? resolvedOptions : undefined,
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

  if (req.method === "GET" && path === "/game-definitions") {
    const definitions = await ensureSupportedGameDefinitions();
    res.status(200).json(definitions);
    return;
  }

  if (req.method === "GET" && path.startsWith("/game-definitions/")) {
    const [, , requestedType] = path.split("/");
    const gameType = requestedType?.trim();

    if (!gameType) {
      res.status(400).json({ error: "Missing gameType" });
      return;
    }

    const definition = await ensureGameDefinition(gameType);

    if (!definition) {
      res.status(404).json({ error: "Game definition not found" });
      return;
    }

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

      const summary = await dbAdapter.getDocument<GameSummary>(`gameSummaries/${gameId}`);
      const state = await dbAdapter.getDocument<Record<string, unknown>>(`games/${gameId}`);

      if (!summary || !state) {
        throw new Error("Game not found");
      }

      const statePlayers = extractPlayersFromState(state);
      const playerIndex = statePlayers.findIndex(player => player.id === decoded.uid);
      const gameType = (state as { gameType?: unknown }).gameType;
      const normalizedType = typeof gameType === "string" ? gameType : "unknown";
      const module = backendRegistry[normalizedType];

      if (!hasCanonicalPlayers(state)) {
        throw new Error("Game is missing canonical player records");
      }

      let workingState: Record<string, unknown> = state;

      if (playerIndex >= 0) {
        const players = (state as { players: Record<string, { id: string; name?: string; status?: string; race?: string }> })
          .players;
        workingState = {
          ...state,
          players: {
            ...players,
            [decoded.uid]: { ...players[decoded.uid], status: "joined" },
          },
        } as Record<string, unknown>;
      } else if (module?.api?.addPlayer) {
        const addResult = await module.api.addPlayer({
          gameId,
          state,
          playerId: decoded.uid,
          playerName: await getDisplayName(decoded.uid),
          db: dbAdapter,
        });
        workingState = addResult.state as Record<string, unknown>;
      } else {
        throw new Error("Player is not invited to this game");
      }

      const mergedPlayers = extractPlayersFromState(workingState);
      const requiredPlayers =
        typeof (workingState as { options?: { requiredPlayers?: unknown } }).options?.requiredPlayers === "number"
          ? (workingState as { options: { requiredPlayers: number } }).options.requiredPlayers
          : undefined;
      const enoughPlayers = requiredPlayers ? mergedPlayers.length >= requiredPlayers : mergedPlayers.length > 0;
      const everyoneReady = mergedPlayers.every(player => player.status === "joined" || player.status === "dummy");
      const updatedStatus = enoughPlayers && everyoneReady ? "in-progress" : "waiting";

      await dbAdapter.setDocument(`gameSummaries/${gameId}`, {
        ...summary,
        players: mergedPlayers,
        status: updatedStatus,
      });

      await dbAdapter.setDocument(`games/${gameId}`, {
        ...workingState,
        status: updatedStatus,
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
            ? (data.options as Record<string, unknown>)
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

    const summarySnapshot = await db.doc(`gameSummaries/${gameId}`).get();
    const players = summarySnapshot.exists
      ? normalizePlayerSummaries((summarySnapshot.data() as Partial<GameSummary>).players)
      : [];

    const gameType = (state as { gameType?: unknown }).gameType;
    const module = typeof gameType === "string" ? backendRegistry[gameType] : undefined;

    const extraResponse = module?.api?.buildPlayerResponse
      ? await module.api.buildPlayerResponse({
        gameId,
        playerId: decoded.uid,
        state,
        db: dbAdapter,
      })
      : {};

    res.status(200).json({ ...state, players, ...(extraResponse ?? {}) });
    return;
  }

  res.status(404).json({ error: "Not found" });
});
