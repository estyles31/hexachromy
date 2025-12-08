import { randomInt } from "crypto";
import { BOARD_HEXES, getWorldType, isInPlay, type WorldType } from "../shared/models/BoardLayout.ThroneWorld";
import type {
  ThroneworldGameOptions,
  ThroneworldGameState,
  ThroneworldHomeworldAssignment,
  ThroneworldPlayerStatus,
  ThroneworldPlayerState,
  ThroneworldPlayerView,
  ThroneworldRaceAssignment,
  ThroneworldSystemDetails,
  ThroneworldWorldType,
} from "../shared/models/GameState.Throneworld";
import type { PlayerSummary } from "../../../shared/models/GameSummary.js";
import type { SystemDefinition, SystemPool } from "../shared/models/Systems.ThroneWorld";
import systemsJson from "../shared/data/systems.throneworld.json";
import racesJson from "../shared/data/races.throneworld.json";
import { parsePlayerCountFromScenario } from "../shared/utils/scenario";
import type {
  CommitMoveContext,
  CreateGameContext,
  GameBackendModule,
  GetLegalMovesContext,
} from "../../types.js";

type RaceDefinition = { id: string; Name: string };

const SYSTEM_POOLS = systemsJson as SystemPool;
type SystemTile = { systemId: string; definition: SystemDefinition };

const HOMEWORLD_BASE: SystemDefinition = {
  dev: 10,
  spaceTech: 0,
  groundTech: 0,
  spaceUnits: {},
  groundUnits: {},
};

const RACE_DEFINITIONS = racesJson as Record<string, RaceDefinition>;
const ALL_RACES: RaceDefinition[] = Object.values(RACE_DEFINITIONS);

type PoolKey = keyof SystemPool;
type NormalizedWorldType = ThroneworldWorldType | "notinplay";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function assignRaces(playerIds: string[]): Record<string, string> {
  if (playerIds.length > ALL_RACES.length) {
    throw new Error(`Not enough unique races for ${playerIds.length} players`);
  }

  const pool = shuffle(ALL_RACES).slice(0, playerIds.length);

  return playerIds.reduce<Record<string, string>>((acc, playerId, idx) => {
    acc[playerId] = pool[idx]?.Name ?? "";
    return acc;
  }, {});
}

function resolveHomeworldOrder(
  playerIds: string[],
  assignment: ThroneworldHomeworldAssignment,
): string[] {
  if (assignment === "playerOrder") return [...playerIds];
  return shuffle(playerIds);
}

function normalizeWorldType(worldType: WorldType): NormalizedWorldType {
  const normalized = worldType.toLowerCase();
  if (
    normalized === "outer" ||
    normalized === "inner" ||
    normalized === "fringe" ||
    normalized === "throneworld"
  ) {
    return normalized;
  }
  if (normalized === "homeworld") return "homeworld";
  return "notinplay";
}

function buildSystemPool(poolKey: PoolKey): SystemTile[] {
  return SYSTEM_POOLS[poolKey].map((definition, idx) => ({
    systemId: `${poolKey}-${idx}`,
    definition,
  }));
}

function drawRandomSystem(pool: SystemTile[]): SystemTile {
  const index = randomInt(0, pool.length);
  const [tile] = pool.splice(index, 1);
  return tile;
}

async function loadPlayerView(params: {
  gameId: string;
  playerId: string;
  db: CreateGameContext["db"];
}): Promise<ThroneworldPlayerView> {
  const existingView = await params.db.getDocument<ThroneworldPlayerView>(
    `games/${params.gameId}/playerViews/${params.playerId}`,
  );

  if (existingView) return existingView;

  return { playerId: params.playerId, systems: {} } satisfies ThroneworldPlayerView;
}

function buildInitialGameDocuments(params: {
  gameId: string;
  playerIds: string[];
  playerStatuses?: Record<string, ThroneworldPlayerStatus>;
  boardId?: string;
  revealAllSystems?: boolean;
  startScannedForAll?: boolean;
  name?: string;
  scenario?: string;
  raceAssignment?: ThroneworldRaceAssignment;
  homeworldAssignment?: ThroneworldHomeworldAssignment;
  forceRandomRaces?: boolean;
  players?: PlayerSummary[];
  requiredPlayers?: number;
}): { state: ThroneworldGameState; playerViews: Record<string, ThroneworldPlayerView> } {
  const { gameId, playerIds } = params;
  const scenario = params.scenario ?? "6p";
  const revealAllSystems = Boolean(params.revealAllSystems);
  const startScannedForAll = Boolean(params.startScannedForAll);
  const scanForAll = startScannedForAll || revealAllSystems;
  const boardId = params.boardId ?? "standard-6p";
  const name = params.name ?? undefined;
  const playerCount = parsePlayerCountFromScenario(scenario, params.requiredPlayers ?? playerIds.length);

  const requestedRaceAssignment: ThroneworldRaceAssignment = params.raceAssignment ?? "random";
  const requestedHomeworldAssignment: ThroneworldHomeworldAssignment = params.homeworldAssignment ?? "random";
  const forceRandomRaces = params.forceRandomRaces ?? true;

  const appliedRaceAssignment: ThroneworldRaceAssignment = forceRandomRaces
    ? "random"
    : requestedRaceAssignment;
  const appliedHomeworldAssignment: ThroneworldHomeworldAssignment =
    requestedHomeworldAssignment === "playerOrder" ? "playerOrder" : "random";

  const races = assignRaces(playerIds);
  const homeworldQueue = resolveHomeworldOrder(playerIds, appliedHomeworldAssignment);

  const baseSummaries: PlayerSummary[] = Array.isArray(params.players)
    ? params.players
    : playerIds.map(playerId => ({ id: playerId, name: playerId, status: "invited" as const }));

  const players: Record<string, ThroneworldPlayerState> = baseSummaries.reduce(
    (acc, player) => {
      const status: ThroneworldPlayerStatus =
        (params.playerStatuses?.[player.id] ?? player.status ?? "invited") as ThroneworldPlayerStatus;
      acc[player.id] = {
        id: player.id,
        name: typeof player.name === "string" && player.name.trim().length > 0 ? player.name : player.id,
        status,
        race: typeof races[player.id] === "string" ? races[player.id] : player.race ?? "Unknown",
      } satisfies ThroneworldPlayerState;
      return acc;
    },
    {} as Record<string, ThroneworldPlayerState>,
  );

  const pools: Record<PoolKey, SystemTile[]> = {
    outer: buildSystemPool("outer"),
    inner: buildSystemPool("inner"),
    fringe: buildSystemPool("fringe"),
    throneworld: buildSystemPool("throneworld"),
  };

  const systems: Record<string, ThroneworldGameState["systems"][string]> = {};
  const playerViews: Record<string, ThroneworldPlayerView> = {
    neutral: { playerId: "neutral", systems: {} },
  };

  for (const playerId of Object.keys(players)) {
    playerViews[playerId] = { playerId, systems: {} };
  }

  for (const hex of BOARD_HEXES) {
    if (!isInPlay(hex.id, playerCount)) continue;

    const worldType = normalizeWorldType(getWorldType(hex.id, playerCount));

    if (worldType === "notinplay") continue;

    if (worldType === "homeworld") {
      const playerId = homeworldQueue.shift();
      if (playerId) {
        const details: ThroneworldSystemDetails = {
          systemId: `homeworld-${playerId}`,
          owner: playerId,
          ...HOMEWORLD_BASE,
        };

        const scannedBy = scanForAll ? Object.keys(players) : [];

        systems[hex.id] = {
          hexId: hex.id,
          location: { col: hex.col, row: hex.row },
          worldType,
          revealed: true,
          scannedBy,
          details,
        };

        playerViews.neutral.systems[hex.id] = details;

        playerViews[playerId].systems[hex.id] = details;

        if (scanForAll) {
          for (const playerId of Object.keys(players)) {
            playerViews[playerId].systems[hex.id] = details;
          }
        }
      }
      continue;
    }

    const poolKey = worldType as PoolKey;
    const pool = pools[poolKey];
    if (!pool || pool.length === 0) {
      throw new Error(`No remaining systems in pool '${poolKey}' for hex ${hex.id}`);
    }
    const { systemId, definition } = drawRandomSystem(pool);
    const details: ThroneworldSystemDetails = {
      systemId,
      owner: null,
      ...definition,
    };

    const shouldReveal = revealAllSystems;
    const scannedBy = scanForAll ? Object.keys(players) : [];

    systems[hex.id] = {
      hexId: hex.id,
      location: { col: hex.col, row: hex.row },
      worldType,
      revealed: shouldReveal,
      scannedBy,
      ...(shouldReveal ? { details } : {}),
    };

    playerViews.neutral.systems[hex.id] = details;

    if (scanForAll || shouldReveal) {
      for (const playerId of Object.keys(players)) {
        playerViews[playerId].systems[hex.id] = details;
      }
    }
  }

  if (homeworldQueue.length > 0) {
    throw new Error("Not all players received a homeworld assignment");
  }

  const hasEnoughPlayers =
    typeof params.requiredPlayers === "number"
      ? Object.keys(players).length >= params.requiredPlayers
      : Object.keys(players).length > 0;
  const allPlayersReady =
    hasEnoughPlayers &&
    Object.values(players).every(player => player.status === "joined" || player.status === "dummy");

  return {
    state: {
      gameId,
      name,
      createdAt: Date.now(),
      scenario,
      boardId,
      players,
      systems,
      gameType: "throneworld",
      status: allPlayersReady ? "in-progress" : "waiting",
      options: {
        startScannedForAll,
        raceAssignment: appliedRaceAssignment,
        forceRandomRaces,
        homeworldAssignment: appliedHomeworldAssignment,
        requiredPlayers: params.requiredPlayers,
      },
    },
    playerViews,
  };
}

async function createGame(context: CreateGameContext<ThroneworldGameState>): Promise<ThroneworldGameState> {
  const options = (context.options ?? {}) as ThroneworldGameOptions;

  const raceAssignment: ThroneworldRaceAssignment =
    options.raceAssignment === "playerChoice" ? "playerChoice" : "random";
  const homeworldAssignment: ThroneworldHomeworldAssignment =
    options.homeworldAssignment === "playerOrder" ? "playerOrder" : "random";
  const forceRandomRaces = options.forceRandomRaces === false ? false : true;

  const baseStatuses = context.playerIds.reduce<Record<string, ThroneworldPlayerStatus>>((acc, id) => {
    acc[id] = "joined";
    return acc;
  }, {});

  const mergedStatuses: Record<string, ThroneworldPlayerStatus> = {
    ...baseStatuses,
    ...(typeof (options as { playerStatuses?: unknown }).playerStatuses === "object"
      ? ((options as { playerStatuses?: Record<string, ThroneworldPlayerStatus> }).playerStatuses ?? {})
      : {}),
  };

  const providedPlayers = Array.isArray((options as { playerSummaries?: unknown }).playerSummaries)
    ? ((options as { playerSummaries: PlayerSummary[] }).playerSummaries as PlayerSummary[])
    : undefined;

  const { state, playerViews } = buildInitialGameDocuments({
    gameId: context.gameId,
    playerIds: context.playerIds,
    scenario: context.scenario,
    playerStatuses: mergedStatuses,
    boardId: typeof options.boardId === "string" ? options.boardId : undefined,
    startScannedForAll: Boolean(options.startScannedForAll),
    name: typeof options.name === "string" ? options.name : undefined,
    raceAssignment,
    homeworldAssignment,
    forceRandomRaces,
    players: providedPlayers,
    requiredPlayers: typeof options.requiredPlayers === "number" ? options.requiredPlayers : undefined,
  });

  await Promise.all(
    Object.entries(playerViews).map(([playerId, view]) =>
      context.db.setDocument(`games/${context.gameId}/playerViews/${playerId}`, view),
    ),
  );

  context.returnState?.(state);

  return state;
}

async function addPlayerToThroneworldGame(params: {
  gameId: string;
  state: ThroneworldGameState;
  playerId: string;
  playerName: string;
  db: CreateGameContext["db"];
  requiredPlayers?: number;
}): Promise<ThroneworldGameState> {
  const requiredPlayers =
    typeof params.requiredPlayers === "number"
      ? params.requiredPlayers
      : typeof params.state.options?.requiredPlayers === "number"
        ? params.state.options.requiredPlayers
        : undefined;

  const existingPlayers = params.state.players;
  const existingPlayerIds = Object.keys(existingPlayers);

  if (requiredPlayers && existingPlayerIds.length >= requiredPlayers) {
    throw new Error("No open player slots remain for this game");
  }

  if (existingPlayers[params.playerId]) {
    return params.state;
  }

  const playerCount = parsePlayerCountFromScenario(
    params.state.scenario,
    requiredPlayers ?? existingPlayerIds.length + 1,
  );

  const availableHomeworld = BOARD_HEXES.find(hex => {
    const inPlay = isInPlay(hex.id, playerCount);
    const worldType = normalizeWorldType(getWorldType(hex.id, playerCount));
    return inPlay && worldType === "homeworld" && !params.state.systems[hex.id];
  });

  if (!availableHomeworld) {
    throw new Error("No available homeworld for an additional player");
  }

  const startScannedForAll = Boolean(params.state.options?.startScannedForAll);
  const scannedBy = startScannedForAll ? [...existingPlayerIds, params.playerId] : [];

  const details: ThroneworldSystemDetails = {
    systemId: `homeworld-${params.playerId}`,
    owner: params.playerId,
    ...HOMEWORLD_BASE,
  };

  const newSystems = {
    ...params.state.systems,
    [availableHomeworld.id]: {
      hexId: availableHomeworld.id,
      location: { col: availableHomeworld.col, row: availableHomeworld.row },
      worldType: "homeworld" as const,
      revealed: true,
      scannedBy,
      details,
    },
  } satisfies ThroneworldGameState["systems"];

  const usedRaceNames = new Set(Object.values(existingPlayers).map(player => player.race));
  const nextRace = ALL_RACES.find(race => !usedRaceNames.has(race.Name))?.Name ?? ALL_RACES[0]?.Name ?? "Unknown";

  const updatedPlayers: Record<string, ThroneworldPlayerState> = {
    ...existingPlayers,
    [params.playerId]: {
      id: params.playerId,
      name: params.playerName,
      status: "joined",
      race: nextRace,
    },
  };

  const updatedPlayerIds = Object.keys(updatedPlayers);

  const updatedOptions: ThroneworldGameOptions = {
    ...(params.state.options ?? {}),
    requiredPlayers,
  };

  const hasEnoughPlayers = requiredPlayers ? updatedPlayerIds.length >= requiredPlayers : true;
  const everyoneReady =
    hasEnoughPlayers &&
    Object.values(updatedPlayers).every(player => player.status === "joined" || player.status === "dummy");

  const updatedState: ThroneworldGameState = {
    ...params.state,
    players: updatedPlayers,
    systems: newSystems,
    options: updatedOptions,
    status: everyoneReady ? "in-progress" : "waiting",
  };

  const neutralView = await loadPlayerView({ db: params.db, gameId: params.gameId, playerId: "neutral" });
  neutralView.systems[availableHomeworld.id] = details;
  await params.db.setDocument(`games/${params.gameId}/playerViews/neutral`, neutralView);

  if (startScannedForAll) {
    await Promise.all(
      updatedPlayerIds.map(async id => {
        const view = await loadPlayerView({ db: params.db, gameId: params.gameId, playerId: id });
        view.systems = {
          ...neutralView.systems,
          ...view.systems,
          [availableHomeworld.id]: details,
        };
        await params.db.setDocument(`games/${params.gameId}/playerViews/${id}`, view);
      }),
    );
  } else {
    const newPlayerView = await loadPlayerView({ db: params.db, gameId: params.gameId, playerId: params.playerId });
    newPlayerView.systems[availableHomeworld.id] = details;
    await params.db.setDocument(`games/${params.gameId}/playerViews/${params.playerId}`, newPlayerView);
  }

  await params.db.setDocument(`games/${params.gameId}`, updatedState);

  return updatedState;
}

async function commitMove(context: CommitMoveContext): Promise<ThroneworldGameState> {
  const state = await context.db.getDocument<ThroneworldGameState>(`games/${context.gameId}`);
  if (!state) {
    throw new Error(`Game ${context.gameId} not found for commitMove`);
  }
  return state;
}

async function getLegalMoves(context: GetLegalMovesContext<ThroneworldGameState>): Promise<unknown[]> {
  const state =
    context.state ??
    (await context.db.getDocument<ThroneworldGameState>(`games/${context.gameId}`));
  if (!state) {
    throw new Error(`Game ${context.gameId} not found when requesting legal moves`);
  }
  return [];
}

export const throneworldBackend: GameBackendModule = {
  id: "throneworld",
  createGame,
  commitMove,
  getLegalMoves,
};

export { addPlayerToThroneworldGame };
