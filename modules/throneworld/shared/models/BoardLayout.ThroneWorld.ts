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

assertAllHexReferencesValid();


