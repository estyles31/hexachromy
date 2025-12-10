// /modules/throneworld/functions/createThroneworldGame.ts
import { randomInt } from "crypto";
import {
    BOARD_HEXES,
    getWorldType,
    isInPlay,
    type WorldType,
} from "../shared/models/BoardLayout.ThroneWorld";
import type {
    ThroneworldGameState,
    ThroneworldPlayerView,
    ThroneworldSystemDetails,
    ThroneworldPlayerState,
    ThroneworldWorldType,
    ThroneworldState,
} from "../shared/models/GameState.Throneworld";
import type { Player, PlayerStatus } from "../../../shared/models/GameState";
import type { SystemDefinition, SystemPool } from "../shared/models/Systems.ThroneWorld";
import systemsJson from "../shared/data/systems.throneworld.json";
import racesJson from "../shared/data/races.throneworld.json";
import { GameStartContext } from "../../../shared/models/ApiContexts";
import { ThroneworldFaction } from "../shared/models/Faction.ThroneWorld";
import { PlayerSlot } from "../../../shared/models/PlayerSlot";

// TODO: extract this to a shared file
const PLAYER_COLORS = ["#ff7043", "#4dd0e1", "#ce93d8", "#aed581", "#ffd54f", "#90caf9"];

export async function createGame(ctx: GameStartContext): Promise<ThroneworldGameState> {
    const filledPlayers = playerSlotsToPlayers(ctx.playerSlots);

    const { state, playerViews } = buildInitialGameDocuments({
        gameId: ctx.gameId,
        playerSlots: ctx.playerSlots,  
        players: filledPlayers,
        options: ctx.options,
        name: ctx.name,
        scenario: ctx.scenario.id,
        requiredPlayers: ctx.scenario.playerCount,
    });

    // Persist core state
    await ctx.db.setDocument(`games/${ctx.gameId}`, state);

    // Persist per-player views
    for (const [pid, view] of Object.entries(playerViews)) {
        await ctx.db.setDocument(`games/${ctx.gameId}/playerViews/${pid}`, view);
    }

    return state;
}

const SYSTEM_POOLS = systemsJson as SystemPool;
type SystemTile = { systemId: string; definition: SystemDefinition };

const HOMEWORLD_BASE: SystemDefinition = {
    dev: 10,
    spaceTech: 0,
    groundTech: 0,
    spaceUnits: {},
    groundUnits: {},
};

const Factions = racesJson as Record<string, ThroneworldFaction>;
const ALL_FACTIONS: ThroneworldFaction[] = Object.values(Factions);

type PoolKey = keyof SystemPool;
type NormalizedWorldType = ThroneworldWorldType | "notinplay";

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
    .filter(slot => slot.type === "human" || slot.type === "bot")
    .map(slot => {
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
  return slots.every(slot => slot.type !== "open");
}

// function getFilledSlotCount(slots: PlayerSlot[]): number {
//   return slots.filter(slot => slot.type !== "open").length;
// }

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

/**
 * Assign races randomly to players (current behavior).
 * Later you can branch on options.raceAssignment === "playerChoice".
 */
function assignFactions(players: Player[]): Record<string, string> {
    if (players.length > ALL_FACTIONS.length) {
        throw new Error(`Not enough unique factions for ${players.length} players`);
    }

    const pool = shuffle(ALL_FACTIONS).slice(0, players.length);

    return players.reduce<Record<string, string>>((acc, player, idx) => {
        acc[player.uid] = pool[idx]?.Name ?? "";
        return acc;
    }, {});
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

/**
 * Right now we always randomize homeworld order.
 * Later you can branch on options.homeworldAssignment === "playerOrder".
 */
function resolveHomeworldOrder(players: Player[]): Player[] {
    return shuffle(players);
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
    scenario?: string;        // e.g. "standard-4p", but we mostly care about playerCount
    requiredPlayers?: number; // if you want to enforce a min player count
}

/**
 * Builds the initial Throneworld state + per-player views:
 * - assigns factions
 * - assigns homeworlds
 * - draws random systems
 * - respects startScannedForAll (and revealAll, if you add it later)
 */
export function buildInitialGameDocuments(
    params: BuildInitialParams,
): {
    state: ThroneworldGameState;
    playerViews: Record<string, ThroneworldPlayerView>;
} {
    const {
        gameId,
        playerSlots,
        players,
        options,
    } = params;

    const totalSlots = playerSlots.length;
    const allFilled = allSlotsFilled(playerSlots);
    const name = params.name ?? undefined;

    // Game options we actually use right now
    const startScannedForAll = Boolean(options.startScannedForAll);
    const scanForAll = startScannedForAll; // you can add revealAllSystems later if you want

    // For now: always random factions and random homeworlds
    const factions = assignFactions(players);
    const homeworldQueue = resolveHomeworldOrder(players);
    const colors = assignColors(players);

    // If you want initial statuses from options, add a field to ThroneworldGameOptions
    const playerStatuses: Record<string, PlayerStatus> = {};
    for (const p of players) {
        playerStatuses[p.uid] = "joined"; // or derive from options if you wire that up
    }

    // Summary players (for UI or summaries)
    const throneworldPlayers: Record<string, ThroneworldPlayerState> =
        players.reduce((acc: Record<string, ThroneworldPlayerState>, player) => {
            acc[player.uid] = {
                uid: player.uid,
                displayName: player.displayName,
                status: playerStatuses[player.uid],
                race: factions[player.uid],
                resources: 0,
                color: colors[player.uid],
            }
            return acc;
        }, {});

    // System pools: outer / inner / fringe / throneworld
    const pools: Record<PoolKey, SystemTile[]> = {
        outer: buildSystemPool("outer"),
        inner: buildSystemPool("inner"),
        fringe: buildSystemPool("fringe"),
        throneworld: buildSystemPool("throneworld"),
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
        if (!isInPlay(hex.id, totalSlots)) continue;

        const worldType = normalizeWorldType(getWorldType(hex.id, totalSlots));
        if (worldType === "notinplay") continue;

        // Homeworlds
        if (worldType === "homeworld") {
            const player = homeworldQueue.shift();
            if (player) {
                const details: ThroneworldSystemDetails = {
                    systemId: `homeworld-${player.uid}`,
                    owner: player.uid,
                    ...HOMEWORLD_BASE,
                };

                systems[hex.id] = {
                    hexId: hex.id,
                    location: { col: hex.col, row: hex.row },
                    worldType,
                    revealed: true,
                    scannedBy: [],
                    details,
                };
            }
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
            systemId,
            owner: null,
            ...definition,
        };

        const revealed = false;        // not revealed at start, unless you add a debug flag
        const scannedBy = scanForAll ? players.map(p => p.uid) : [];

        systems[hex.id] = {
            hexId: hex.id,
            location: { col: hex.col, row: hex.row },
            worldType,
            revealed,
            scannedBy,
            ...(revealed ? { details } : {}),
        };

        // Neutral view knows the full system contents
        playerViews.neutral.systems[hex.id] = details;

        if (scanForAll) {
            for (const player of players) {
                playerViews[player.uid].systems[hex.id] = details;
            }
        }
    }

    if (homeworldQueue.length > 0) {
        throw new Error("Not all players received a homeworld assignment");
    }

    const allPlayersReady = allFilled && players.every(
        p => p.status === "joined" || p.status === "dummy"
    );

    // Build the final ThroneworldGameState
    const state: ThroneworldGameState = {
        gameId,
        gameType: "throneworld",
        name,
        createdAt: Date.now(),

        status: allPlayersReady ? "in-progress" : "waiting",
        players: throneworldPlayers,

        options: {
            ...options,
            requiredPlayers: params.requiredPlayers,
            scenario: params.scenario,
        },

        state: {
            systems,
            currentPhase: "StartGame",
        },

        version: 0,
        actionSequence: 0,
        playerUndoStacks: {},
    };

    return { state, playerViews };
}
