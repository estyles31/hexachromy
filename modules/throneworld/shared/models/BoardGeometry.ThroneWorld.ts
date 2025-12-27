import type { BoardGeometry } from "../../../../shared/models/BoardGeometry";
import { BOARD_HEXES, getWorldType, isInPlay, type WorldType } from "./BoardLayout.ThroneWorld";

export const HEX_RADIUS = 86;
export const HEX_PADDING = 1;

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

export interface ThroneworldBoardGeometry extends BoardGeometry {
  hexes: Record<string, HexGeometry>;
  hexRadius: number;
  margin: number;
}

/**
 * Get SVG polygon points for a flat-top hexagon
 */
export function getHexagonPoints(cx: number, cy: number, r: number): string {
  const angles = [0, 60, 120, 180, 240, 300];
  return angles.map(deg => {
    const rad = (deg * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

export function computeBoardGeometry(scenario: string): ThroneworldBoardGeometry {
  const playableHexes = BOARD_HEXES.filter(h => isInPlay(h.id, scenario));

  if (playableHexes.length === 0) {
    throw new Error(`No playable hexes for scenario ${scenario}`);
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const hexes: HexGeometry[] = playableHexes.map(hex => {
    const cx = hex.colIndex * X_SPACING;
    const cy = hex.row * Y_SPACING;
    const worldType = getWorldType(hex.id, scenario);

    // For flat-top hexagons:
    // - Horizontal extent: center ± HEX_RADIUS (distance to left/right vertices)
    // - Vertical extent: center ± HEX_HEIGHT / 2 (distance to top/bottom flat edges)
    minX = Math.min(minX, cx - HEX_RADIUS);
    maxX = Math.max(maxX, cx + HEX_RADIUS);
    minY = Math.min(minY, cy - HEX_HEIGHT / 2);
    maxY = Math.max(maxY, cy + HEX_HEIGHT / 2);

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
    hexRadius: HEX_RADIUS
  };
}