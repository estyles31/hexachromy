// /modules/throneworld/functions/createThroneworldGame.ts
import { randomInt } from "crypto";
import { BOARD_HEXES, getWorldType, isInPlay } from "../shared/models/BoardLayout.ThroneWorld";
import type {
  ThroneworldGameState,
  ThroneworldPlayerView,
  ThroneworldPlayerState,
  ThroneworldState,
} from "../shared/models/GameState.Throneworld";
import type { GameState, Player, PlayerStatus } from "../../../shared/models/GameState";
import type { SystemPool, ThroneworldSystemDetails } from "../shared/models/Systems.ThroneWorld";
import systemsJson from "../shared/data/systems.throneworld.json";
import { GameStartContext } from "../../../shared/models/ApiContexts";
import { PlayerSlot } from "../../../shared/models/PlayerSlot";
import { ThroneworldPhaseManager } from "./phases/PhaseManager";
import { dbAdapter } from "../../../functions/src/services/database";
import { ActionResponse, SystemAction } from "../../../shared/models/GameAction";

// TODO: extract this to a shared file
const PLAYER_COLORS = ["#ff7043", "#4dd0e1", "#ce93d8", "#aed581", "#ffd54f", "#90caf9"];

export async function createGame(ctx: GameStartContext): Promise<GameState> {
  const filledPlayers = playerSlotsToPlayers(ctx.playerSlots);

  const { state, playerViews } = await buildInitialGameDocuments({
    gameId: ctx.gameId,
    playerSlots: ctx.playerSlots,
    players: filledPlayers,
    options: ctx.options,
    name: ctx.name,
    scenario: ctx.scenario.id,
    requiredPlayers: ctx.scenario.playerCount,
  });

  console.log(`Created Throneworld game ${ctx.gameId} with ${ctx.playerSlots.length} players.`);

  // Persist core state
  await ctx.db.setDocument(`games/${ctx.gameId}`, state);

  // Persist per-player views
  for (const [pid, view] of Object.entries(playerViews)) {
    await ctx.db.setDocument(`games/${ctx.gameId}/playerViews/${pid}`, view);
  }

  // Initialize the starting phase (handles random assignment, etc.)
  const phaseManager = new ThroneworldPhaseManager(state.gameId, dbAdapter);
  await phaseManager.getGameState();

  // Trigger the phase start through the normal action flow
  class InitGameAction extends SystemAction {
    constructor() {
      super("initGame");
    }
  }
  const result: ActionResponse = {
    action: new InitGameAction(),
    success: true,
    message: "Game initialized",
    undoable: false,
    phaseTransition: {
      nextPhase: "GameStart",
      transitionType: "nextPhase",
    },
  };

  await phaseManager.postExecuteAction("system", result);
  return phaseManager.getGameState();
}

const SYSTEM_POOLS = systemsJson as SystemPool;
type SystemTile = { systemId: string; definition: ThroneworldSystemDetails };

const HOMEWORLD_BASE: ThroneworldSystemDetails = {
  systemId: "homeworld",
  dev: 10,
  spaceTech: 0,
  groundTech: 0,
  spaceUnits: {},
  groundUnits: {},
};

type PoolKey = keyof SystemPool;

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function playerSlotsToPlayers(slots: PlayerSlot[]): Player[] {
  return slots
    .filter((slot) => slot.type === "human" || slot.type === "bot")
    .map((slot) => {
      if (slot.type === "human") {
        return {
          uid: slot.uid,
          displayName: slot.displayName,
          status: "joined" as const,
        };
      } else {
        return {
          uid: slot.botId,
          displayName: slot.displayName,
          status: "dummy" as const,
        };
      }
    });
}

function allSlotsFilled(slots: PlayerSlot[]): boolean {
  return slots.every((slot) => slot.type !== "open");
}

// function getFilledSlotCount(slots: PlayerSlot[]): number {
//   return slots.filter(slot => slot.type !== "open").length;
// }

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

//eventually want a better way to assign colors
function assignColors(players: Player[]): Record<string, string> {
  if (players.length > PLAYER_COLORS.length) {
    throw new Error(`Not enough unique colors for ${players.length} players`);
  }

  const pool = shuffle(PLAYER_COLORS).slice(0, players.length);

  return players.reduce<Record<string, string>>((acc, player, idx) => {
    acc[player.uid] = pool[idx] ?? "#000";
    return acc;
  }, {});
}

/* ------------------------------------------------------------------ */
/* Main: buildInitialGameDocuments                                    */
/* ------------------------------------------------------------------ */

interface BuildInitialParams {
  gameId: string;
  playerSlots: PlayerSlot[];
  players: Player[];
  options: Record<string, unknown | null>;
  name?: string;
  scenario: string; // e.g. "4p", "6p", "4p-alt"
  requiredPlayers?: number; // if you want to enforce a min player count
}

/**
 * Builds the initial Throneworld state + per-player views:
 * - draws random systems
 * - respects startScannedForAll (and revealAll, if you add it later)
 */
export async function buildInitialGameDocuments(params: BuildInitialParams): Promise<{
  state: ThroneworldGameState;
  playerViews: Record<string, ThroneworldPlayerView>;
}> {
  const { gameId, playerSlots, players, options, scenario } = params;

  const allFilled = allSlotsFilled(playerSlots);
  const name = params.name ?? "";

  // Game options we actually use right now
  const startScannedForAll = Boolean(options.startScannedForAll);
  const scanForAll = startScannedForAll; // you can add revealAllSystems later if you want

  const colors = assignColors(players);

  // If you want initial statuses from options, add a field to ThroneworldGameOptions
  const playerStatuses: Record<string, PlayerStatus> = {};
  for (const p of players) {
    playerStatuses[p.uid] = "joined"; // or derive from options if you wire that up
  }

  // Summary players (for UI or summaries)
  const throneworldPlayers: Record<string, ThroneworldPlayerState> = players.reduce(
    (acc: Record<string, ThroneworldPlayerState>, player) => {
      acc[player.uid] = {
        uid: player.uid,
        displayName: player.displayName,
        status: playerStatuses[player.uid],
        resources: 0,
        color: colors[player.uid],
        tech: { Ground: 1, Space: 1, Comm: 1, Jump: 1 },
      };
      return acc;
    },
    {}
  );

  // System pools: outer / inner / fringe / throneworld
  const pools: Record<PoolKey, SystemTile[]> = {
    Outer: buildSystemPool("Outer"),
    Inner: buildSystemPool("Inner"),
    Fringe: buildSystemPool("Fringe"),
    Throneworld: buildSystemPool("Throneworld"),
  };

  const systems: ThroneworldState["systems"] = {} as ThroneworldState["systems"];

  const playerViews: Record<string, ThroneworldPlayerView> = {
    neutral: { playerId: "neutral", systems: {} },
  };

  for (const player of players) {
    playerViews[player.uid] = { playerId: player.uid, systems: {} };
  }

  // Place systems on the board
  for (const hex of BOARD_HEXES) {
    if (!isInPlay(hex.id, String(scenario))) continue;

    const worldType = getWorldType(hex.id, scenario);
    if (worldType === "NotInPlay") continue;

    // Homeworlds
    if (worldType === "Homeworld") {
      systems[hex.id] = {
        hexId: hex.id,
        location: { col: hex.col, row: hex.row },
        worldType,
        revealed: true,
        scannedBy: [],
        details: {
          ...HOMEWORLD_BASE,
          systemId: `Homeworld-${hex.id}`,
        } as ThroneworldSystemDetails,
        unitsOnPlanet: {},
        fleetsInSpace: {},
      };

      continue;
    }

    // Non-homeworld systems: draw from pool
    const poolKey = worldType as PoolKey;
    const pool = pools[poolKey];
    if (!pool || pool.length === 0) {
      throw new Error(`No remaining systems in pool '${poolKey}' for hex ${hex.id}`);
    }

    const { systemId, definition } = drawRandomSystem(pool);
    const details: ThroneworldSystemDetails = {
      ...definition,
      systemId,
    };

    const revealed = false; // not revealed at start, unless you add a debug flag
    const scannedBy = scanForAll ? players.map((p) => p.uid) : [];

    systems[hex.id] = {
      hexId: hex.id,
      location: { col: hex.col, row: hex.row },
      worldType,
      revealed,
      scannedBy,
      ...(revealed ? { details } : {}),
      unitsOnPlanet: {},
      fleetsInSpace: {},
    };

    // Neutral view knows the full system contents
    playerViews.neutral.systems[hex.id] = details;

    if (scanForAll) {
      for (const player of players) {
        playerViews[player.uid].systems[hex.id] = details;
      }
    }
  }

  const allPlayersReady = allFilled && players.every((p) => p.status === "joined" || p.status === "dummy");

  // Build the final ThroneworldGameState
  const state: ThroneworldGameState = {
    gameId,
    gameType: "throneworld",
    name,
    createdAt: Date.now(),

    status: allPlayersReady ? "in-progress" : "waiting",
    players: throneworldPlayers,
    playerOrder: shuffle(players.map((player) => player.uid)),

    options: {
      ...options,
      requiredPlayers: params.requiredPlayers,
      scenario: params.scenario,
    },

    state: {
      systems,
      currentPhase: "Init",
    },

    version: 0,
    actionSequence: 0,
    //playerUndoStacks: {},
  };

  return { state, playerViews };
}
