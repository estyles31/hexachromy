import { randomInt } from "crypto";
import { BOARD_HEXES, getWorldType, isInPlay, type WorldType } from "../shared/models/BoardLayout.ThroneWorld.ts";
import type { ThroneworldGameState, ThroneworldSystemState } from "../shared/models/GameState.Throneworld.ts";
import type { SystemPool } from "../shared/models/Systems.ThroneWorld.ts";
import systemsJson from "../shared/data/systems.throneworld.json" with { type: "json" };
import { parsePlayerCountFromScenario } from "../shared/utils/scenario.ts";

const SYSTEM_POOLS = systemsJson as SystemPool;

type PoolKey = keyof SystemPool;
type NormalizedWorldType = PoolKey | "homeworld" | "notinplay";

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

function buildSystemPoolIds(poolKey: PoolKey): string[] {
  return SYSTEM_POOLS[poolKey].map((_, idx) => `${poolKey}-${idx}`);
}

function drawRandomSystemId(pool: string[]): string {
  const index = randomInt(0, pool.length);
  const [systemId] = pool.splice(index, 1);
  return systemId;
}

export function buildInitialGameState(params: {
  gameId: string;
  playerIds: string[];
  scenario?: string;
}): ThroneworldGameState {
  const { gameId, playerIds } = params;
  const scenario = params.scenario ?? "6p";
  const playerCount = parsePlayerCountFromScenario(scenario, playerIds.length);

  const homeworldQueue = [...playerIds];

  const pools: Record<PoolKey, string[]> = {
    outer: buildSystemPoolIds("outer"),
    inner: buildSystemPoolIds("inner"),
    fringe: buildSystemPoolIds("fringe"),
    throneworld: buildSystemPoolIds("throneworld"),
  };

  const systems: Record<string, ThroneworldSystemState> = {};

  for (const hex of BOARD_HEXES) {
    if (!isInPlay(hex.id, playerCount)) continue;

    const worldType = normalizeWorldType(getWorldType(hex.id, playerCount));

    if (worldType === "notinplay") continue;

    if (worldType === "homeworld") {
      const playerId = homeworldQueue.shift();
      if (!playerId) {
        throw new Error("Ran out of players while assigning homeworlds");
      }
      systems[hex.id] = {
        systemId: `homeworld-${playerId}`,
        revealed: true,
        owner: playerId,
      };
      continue;
    }

    const poolKey = worldType as PoolKey;
    const pool = pools[poolKey];
    if (!pool || pool.length === 0) {
      throw new Error(`No remaining systems in pool '${poolKey}' for hex ${hex.id}`);
    }
    const systemId = drawRandomSystemId(pool);

    systems[hex.id] = {
      systemId,
      revealed: false,
      owner: null,
    };
  }

  if (homeworldQueue.length > 0) {
    throw new Error("Not all players received a homeworld assignment");
  }

  return {
    gameId,
    createdAt: Date.now(),
    scenario,
    playerIds,
    systems,
    gameType: "throneworld",
  };
}
