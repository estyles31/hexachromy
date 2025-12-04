import layout from "../../../shared/data/boardLayout.throneworld.json";

export type WorldType =
  | "Homeworld"
  | "Throneworld"
  | "Inner"
  | "Outer"
  | "Fringe"
  | "NotInPlay";

interface RawLayout {
  columns: Record<string, number[]>;
  baseWorldTypes: Record<string, WorldType>;
  worldTypesByPlayers: Record<string, Record<string, WorldType>>;
  defaultWorldType: WorldType;
}

interface BoardHex {
  id: string;
  col: string;
  row: number;
  baseWorldType: WorldType;
  overridesByPlayers: Partial<Record<number, WorldType>>;
}

export interface BoardHexSummary {
  id: string;
  col: string;
  row: number;
  worldType: WorldType;
}

const raw = layout as RawLayout;

function makeId(col: string, row: number): string {
  return `${col}${row}`;
}

function buildHexes(): BoardHex[] {
  const hexes: BoardHex[] = [];

  Object.entries(raw.columns).forEach(([col, rows]) => {
    rows.forEach(row => {
      const id = makeId(col, row);

      const overridesByPlayers: Partial<Record<number, WorldType>> = {};
      Object.entries(raw.worldTypesByPlayers).forEach(([playerCount, map]) => {
        if (map[id]) {
          overridesByPlayers[Number(playerCount)] = map[id];
        }
      });

      hexes.push({
        id,
        col,
        row,
        baseWorldType: raw.baseWorldTypes[id] ?? raw.defaultWorldType,
        overridesByPlayers,
      });
    });
  });

  return hexes;
}

function getWorldType(hex: BoardHex, playerCount: number): WorldType {
  return hex.overridesByPlayers[playerCount] ?? hex.baseWorldType;
}

function isInPlay(hex: BoardHex, playerCount: number): boolean {
  return getWorldType(hex, playerCount) !== "NotInPlay";
}

export function buildBoardsByPlayerCount(playerCounts: number[]): Record<string, BoardHexSummary[]> {
  const boards: Record<string, BoardHexSummary[]> = {};
  const hexes = buildHexes();

  const counts = Array.from(
    new Set<number>([
      ...playerCounts,
      ...Object.keys(raw.worldTypesByPlayers).map(n => Number(n)),
    ]),
  ).sort((a, b) => a - b);

  counts.forEach(playerCount => {
    boards[String(playerCount)] = hexes
      .filter(hex => isInPlay(hex, playerCount))
      .map(hex => ({
        id: hex.id,
        col: hex.col,
        row: hex.row,
        worldType: getWorldType(hex, playerCount),
      }));
  });

  return boards;
}

export function buildBoardSvgByPlayerCount(playerCounts: number[]): Record<string, string> {
  const counts = Array.from(
    new Set<number>([
      ...playerCounts,
      ...Object.keys(raw.worldTypesByPlayers).map(n => Number(n)),
    ]),
  ).sort((a, b) => a - b);

  const svgMap: Record<string, string> = {};
  counts.forEach(playerCount => {
    svgMap[String(playerCount)] = `/boards/throneworld-${playerCount}p.svg`;
  });

  return svgMap;
}
