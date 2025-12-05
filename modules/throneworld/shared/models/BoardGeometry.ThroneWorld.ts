import { BOARD_HEXES, getWorldType, isInPlay, type WorldType } from "./BoardLayout.ThroneWorld.ts";

const HEX_RADIUS = 64;
const HEX_PADDING = 1;

const HEX_WIDTH = HEX_RADIUS * 2;
const HEX_HEIGHT = Math.sqrt(3) * HEX_RADIUS;

const X_SPACING = HEX_WIDTH * 0.75 + HEX_PADDING;
const Y_SPACING = HEX_HEIGHT * 0.5 + HEX_PADDING;

const MARGIN = 20;

export interface HexGeometry {
  hexId: string;
  x: number;
  y: number;
  worldType: WorldType;
}

export interface BoardGeometry {
  width: number;
  height: number;
  hexes: Record<string, HexGeometry>;
  margin: number;
}

export function computeBoardGeometry(playerCount: number): BoardGeometry {
  const playableHexes = BOARD_HEXES.filter(h => isInPlay(h.id, playerCount));

  if (playableHexes.length === 0) {
    throw new Error(`No playable hexes for player count ${playerCount}`);
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const hexes: HexGeometry[] = playableHexes.map(hex => {
    const cx = hex.colIndex * X_SPACING;
    const cy = hex.row * Y_SPACING;
    const worldType = getWorldType(hex.id, playerCount);

    minX = Math.min(minX, cx - HEX_RADIUS);
    maxX = Math.max(maxX, cx + HEX_RADIUS);
    minY = Math.min(minY, cy - HEX_RADIUS);
    maxY = Math.max(maxY, cy + HEX_RADIUS);

    return {
      hexId: hex.id,
      x: cx,
      y: cy,
      worldType,
    };
  });

  const width = (maxX - minX) + MARGIN * 2;
  const height = (maxY - minY) + MARGIN * 2;

  const shiftX = -minX + MARGIN;
  const shiftY = -minY + MARGIN;

  const hexMap: Record<string, HexGeometry> = {};
  for (const hex of hexes) {
    hexMap[hex.hexId] = {
      ...hex,
      x: hex.x + shiftX,
      y: hex.y + shiftY,
    };
  }

  return {
    width,
    height,
    hexes: hexMap,
    margin: MARGIN,
  };
}
