import { randomInt } from "crypto";
import { BOARD_HEXES, getWorldType, isInPlay, type WorldType } from "../shared/models/BoardLayout.ThroneWorld";
import type {
  ThroneworldGameOptions,
  ThroneworldGameState,
  ThroneworldHomeworldAssignment,
  ThroneworldPlayerStatus,
  ThroneworldPlayerView,
  ThroneworldRaceAssignment,
  ThroneworldSystemDetails,
  ThroneworldWorldType,
} from "../shared/models/GameState.Throneworld";
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

const SYSTEM_POOLS = systemsJson as SystemPool;
type SystemTile = { systemId: string; definition: SystemDefinition };

const HOMEWORLD_BASE: SystemDefinition = {
  dev: 10,
  spaceTech: 0,
  groundTech: 0,
  spaceUnits: {},
  groundUnits: {},
};

const ALL_RACES: string[] = (racesJson as string[]).map(race => race.trim()).filter(Boolean);

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
    acc[playerId] = pool[idx];
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
}): { state: ThroneworldGameState; playerViews: Record<string, ThroneworldPlayerView> } {
  const { gameId, playerIds } = params;
  const scenario = params.scenario ?? "6p";
  const playerStatuses = params.playerStatuses ?? {};
  const revealAllSystems = Boolean(params.revealAllSystems);
  const startScannedForAll = Boolean(params.startScannedForAll);
  const scanForAll = startScannedForAll || revealAllSystems;
  const boardId = params.boardId ?? "standard-6p";
  const name = params.name ?? undefined;
  const playerCount = parsePlayerCountFromScenario(scenario, playerIds.length);

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

  for (const playerId of playerIds) {
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

        const scannedBy = scanForAll ? [...playerIds] : [];

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
          for (const playerId of playerIds) {
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
    const scannedBy = scanForAll ? [...playerIds] : [];

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
      for (const playerId of playerIds) {
        playerViews[playerId].systems[hex.id] = details;
      }
    }
  }

  if (homeworldQueue.length > 0) {
    throw new Error("Not all players received a homeworld assignment");
  }

  const allPlayersReady = playerIds.every(playerId =>
    (playerStatuses[playerId] ?? "joined") === "joined" || playerStatuses[playerId] === "dummy",
  );

  return {
    state: {
      gameId,
      name,
      createdAt: Date.now(),
      scenario,
      boardId,
      playerIds,
      playerStatuses: playerIds.reduce<Record<string, ThroneworldPlayerStatus>>(
        (acc, id) => {
          acc[id] = playerStatuses[id] ?? "joined";
          return acc;
        },
        {},
      ),
      systems,
      gameType: "throneworld",
      status: allPlayersReady ? "in-progress" : "waiting",
      options: {
        startScannedForAll,
        raceAssignment: appliedRaceAssignment,
        forceRandomRaces,
        homeworldAssignment: appliedHomeworldAssignment,
        races,
      },
    },
    playerViews,
  };
}

async function createGame(context: CreateGameContext<ThroneworldGameState>): Promise<ThroneworldGameState> {
  const raceAssignment: ThroneworldRaceAssignment =
    context.options?.raceAssignment === "playerChoice" ? "playerChoice" : "random";
  const homeworldAssignment: ThroneworldHomeworldAssignment =
    context.options?.homeworldAssignment === "playerOrder" ? "playerOrder" : "random";
  const forceRandomRaces = context.options?.forceRandomRaces === false ? false : true;

  const { state, playerViews } = buildInitialGameDocuments({
    gameId: context.gameId,
    playerIds: context.playerIds,
    scenario: context.scenario,
    playerStatuses: (context.options?.playerStatuses ?? {}) as Record<string, ThroneworldPlayerStatus>,
    boardId: typeof context.options?.boardId === "string" ? context.options.boardId : undefined,
    startScannedForAll: Boolean(context.options?.startScannedForAll),
    name: typeof context.options?.name === "string" ? context.options.name : undefined,
    raceAssignment,
    homeworldAssignment,
    forceRandomRaces,
  });

  await Promise.all(
    Object.entries(playerViews).map(([playerId, view]) =>
      context.db.setDocument(`games/${context.gameId}/playerViews/${playerId}`, view),
    ),
  );

  context.returnState?.(state);

  return state;
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
