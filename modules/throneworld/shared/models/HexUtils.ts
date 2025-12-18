// /modules/throneworld/shared/models/HexUtils.ts
import { BOARD_HEXES } from "./BoardLayout.ThroneWorld";

/**
 * Calculate the distance between two hexes in hex grid units.
 * Uses cube coordinates for flat-top hexagons.
 */
export function calculateHexDistance(hex1Id: string, hex2Id: string): number {
  if (hex1Id === hex2Id) return 0;

  const h1 = BOARD_HEXES.find(h => h.id === hex1Id);
  const h2 = BOARD_HEXES.find(h => h.id === hex2Id);

  if (!h1 || !h2) return Infinity;

  // Convert to cube coordinates for flat-top hexagons
  const q1 = h1.colIndex;
  const r1 = h1.row - Math.floor(h1.colIndex / 2);
  const s1 = -q1 - r1;

  const q2 = h2.colIndex;
  const r2 = h2.row - Math.floor(h2.colIndex / 2);
  const s2 = -q2 - r2;

  return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2;
}