import data from "../data/boardLayout.throneworld.json";

/* ───────────────────────── */
/* Types                     */
/* ───────────────────────── */

export type ColumnId = string;

export type WorldType =
  | "Homeworld"
  | "Throneworld"
  | "Inner"
  | "Outer"
  | "Fringe"
  | "NotInPlay";

export interface BoardHex {
  id: string;
  col: ColumnId;
  row: number;
  colIndex: number;
  rowIndexInColumn: number;

  baseWorldType: WorldType;
  overridesByScenario: Partial<Record<string, WorldType>>;
}


// use:
// import {
//   BOARD_HEXES,
//   getWorldType,
//   isInPlay
// } from "@/shared/models/BoardLayout.ThroneWorld";

// const playerCount = game.players.length;

// const activeHexes = BOARD_HEXES.filter(h =>
//   isInPlay(h.id, playerCount)
// );


/* ───────────────────────── */
/* Raw JSON Schema           */
/* ───────────────────────── */

interface RawLayout {
  worldTypes: WorldType[];
  columns: Record<string, number[]>;
  baseWorldTypes: Record<string, WorldType>;
  worldTypesByScenario: Record<string, Record<string, WorldType>>;
  defaultWorldType: WorldType;
}

const raw = data as unknown as RawLayout;
export const scenarioIds = Object.keys(raw.worldTypesByScenario);

/* ───────────────────────── */
/* Helpers                   */
/* ───────────────────────── */

function colIndex(col: string): number {
  const first = col.charCodeAt(0);
  return first - "A".charCodeAt(0);
}

function makeId(col: string, row: number) {
  return `${col}${row}`;
}

/* ───────────────────────── */
/* Build Board Geometry      */
/* ───────────────────────── */

export const BOARD_HEXES: BoardHex[] = [];

Object.entries(raw.columns).forEach(([col, rows]) => {
  rows.forEach((row, rowIndexInColumn) => {

    const id = makeId(col, row);

    const baseWorldType =
      raw.baseWorldTypes[id] ??
      raw.defaultWorldType;

    const overridesByScenario: Partial<Record<string, WorldType>> = {};

    Object.entries(raw.worldTypesByScenario).forEach(
      ([scenarioId, map]) => {
        if (map[id]) {
          overridesByScenario[scenarioId] = map[id];
        }
      }
    );

    BOARD_HEXES.push({
      id,
      col: col as ColumnId,
      row,
      colIndex: colIndex(col as ColumnId),
      rowIndexInColumn,
      baseWorldType,
      overridesByScenario
    });
  });
});

/* ───────────────────────── */
/* Index by ID               */
/* ───────────────────────── */

export const BOARD_HEXES_BY_ID: Record<string, BoardHex> =
  Object.fromEntries(BOARD_HEXES.map(h => [h.id, h]));

/* ───────────────────────── */
/* Access API                */
/* ───────────────────────── */

export function getWorldType(
  hexId: string,
  scenarioId: string
): WorldType {

  const hex = BOARD_HEXES_BY_ID[hexId];
  if (!hex) throw new Error(`Unknown hex: ${hexId}`);

  return (
    hex.overridesByScenario[scenarioId] ??
    hex.baseWorldType
  );
}

export function isInPlay(
  hexId: string,
  scenarioId: string
): boolean {
  return getWorldType(hexId, scenarioId) !== "NotInPlay";
}


// validation
function assertHexExists(hexId: string) {
  const col = hexId[0];
  const row = hexId.slice(1);

  if (!raw.columns[col]) {
    throw new Error(`Unknown column '${col}' referenced by ${hexId}`);
  }

  if (!raw.columns[col].includes(Number(row))) {
    throw new Error(`Invalid row '${row}' in hex ${hexId}`);
  }
}

function assertAllHexReferencesValid() {
  const check = (id: string) => assertHexExists(id);

  Object.keys(raw.baseWorldTypes).forEach(check);

  Object.values(raw.worldTypesByScenario).forEach(map =>
    Object.keys(map).forEach(check)
  );
}

/* ───────────────────────── */
/* Neighbor lookup table     */
/* (blocked by NotInPlay)    */
/* ───────────────────────── */

export const HEX_NEIGHBORS: Record<string, string[]> = {};

function buildNeighbors() {
  const byCoord = new Map<string, string>();

  for (const h of BOARD_HEXES) {
    byCoord.set(`${h.colIndex},${h.row}`, h.id);
  }

  for (const h of BOARD_HEXES) {
    const neighbors: string[] = [];

    for (const { dc, dr } of neighborOffsets()) {
      const key = `${h.colIndex + dc},${h.row + dr}`;
      const id = byCoord.get(key);
      if (id) neighbors.push(id);
    }

    HEX_NEIGHBORS[h.id] = neighbors;
  }
}


function neighborOffsets(): Array<{ dc: number; dr: number }> {
  return [
    { dc:  0, dr: -2 },
    { dc:  0, dr: +2 },

    { dc: -1, dr: -1 },
    { dc: -1, dr: +1 },

    { dc: +1, dr: -1 },
    { dc: +1, dr: +1 },
  ];
}


/**
 * BFS topology distance.
 * - blocks through NotInPlay
 * - returns Infinity if unreachable
 */
export function hexGraphDistance(a: string, b: string, scenarioId: string): number {
  if (a === b) return 0;

  const visited = new Set<string>([a]);
  let frontier = [a];
  let dist = 0;

  while (frontier.length > 0) {
    dist++;

    const next: string[] = [];

    for (const hex of frontier) {
      for (const n of HEX_NEIGHBORS[hex]) {

        // skip hexes not in play for this scenario
        if (!isInPlay(n, scenarioId)) continue;

        if (n === b) return dist;

        if (!visited.has(n)) {
          visited.add(n);
          next.push(n);
        }
      }
    }

    frontier = next;
  }

  return Infinity;
}


/* ───────────────────────── */
/* Scan Range (BFS radius)   */
/* ───────────────────────── */

export function getHexesWithinRange(center: string, radius: number, scenarioId: string): string[] {
  if (radius <= 0) return [];

  const visited = new Set<string>([center]);
  let frontier = [center];
  let dist = 0;
  const result: string[] = [center];

  while (dist < radius) {
    const next: string[] = [];

    for (const hex of frontier) {
      for (const n of HEX_NEIGHBORS[hex]) {
        if (!isInPlay(n, scenarioId)) continue;
        if (visited.has(n)) continue;

        visited.add(n);
        next.push(n);
        result.push(n);
      }
    }

    frontier = next;
    dist++;
  }

  return result;
}

function assertNeighborSymmetry() {
  for (const [a, ns] of Object.entries(HEX_NEIGHBORS)) {
    for (const b of ns) {
      if (!HEX_NEIGHBORS[b]?.includes(a)) {
        throw new Error(`Asymmetric neighbor: ${a} ↔ ${b}`);
      }
    }
  }
}

assertAllHexReferencesValid();
buildNeighbors();
assertNeighborSymmetry();
