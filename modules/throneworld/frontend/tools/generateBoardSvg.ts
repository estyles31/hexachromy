// /hexachromy/modules/throneworld/frontend/tools/generateBoardSvg.ts

import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

import { buildDefs, getWorldFill, getBackgroundRects, getBaseStyles, config }
  from "./svgVisuals.throneworld";

import {
  BOARD_HEXES,
  getWorldType,
  isInPlay,
  scenarioIds,
  type WorldType
} from "../../shared/models/BoardLayout.ThroneWorld";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hex geometry (flat-top)
const HEX_RADIUS = 64;
const HEX_PADDING = 1;

const HEX_WIDTH  = HEX_RADIUS * 2;
const HEX_HEIGHT = Math.sqrt(3) * HEX_RADIUS;

// Spacing derived from your coordinate system
const X_SPACING = HEX_WIDTH * 0.75 + HEX_PADDING;     
const Y_SPACING = HEX_HEIGHT * 0.5 + HEX_PADDING;      

const MARGIN = 20;

type HexRender = {
  id: string;
  col: string;
  row: number;
  worldType: WorldType;
  cx: number;
  cy: number;
};

/* ───────── Entry point ───────── */

export async function generateBoardSvgs() {
  const outDir = path.resolve(__dirname, "../public/boards");
  fs.mkdirSync(outDir, { recursive: true });

  for (const scen of scenarioIds) {
    const svg = generateSvgForScenario(scen);
    const fileName = `throneworld-${scen}.svg`;
    const outPath = path.join(outDir, fileName);
    fs.writeFileSync(outPath, svg, "utf-8");
    console.log(`Wrote ${outPath}`);
  }
}

/* ───────── Board Generator ───────── */

function generateSvgForScenario(scenarioId: string): string {
  const playable = BOARD_HEXES.filter(h => isInPlay(h.id, scenarioId));

  if (playable.length === 0) {
    throw new Error(`No playable hexes for scenarioId=${scenarioId}`);
  }

  const hexes: HexRender[] = [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const hex of playable) {
    const cx = hex.colIndex * X_SPACING;
    const cy = hex.row * Y_SPACING;

    const worldType = getWorldType(hex.id, scenarioId);

    hexes.push({
      id: hex.id,
      col: hex.col,
      row: hex.row,
      worldType,
      cx,
      cy
    });

    minX = Math.min(minX, cx - HEX_RADIUS);
    maxX = Math.max(maxX, cx + HEX_RADIUS);
    minY = Math.min(minY, cy - HEX_RADIUS);
    maxY = Math.max(maxY, cy + HEX_RADIUS);
  }

  // Normalize board to positive space with margin
  const width  = (maxX - minX) + MARGIN * 2;
  const height = (maxY - minY) + MARGIN * 2;

  const shiftX = -minX + MARGIN;
  const shiftY = -minY + MARGIN;

  const defs = buildDefs();
  const bg = getBackgroundRects(width, height);
  const styles = getBaseStyles();

  const elements: string[] = [];

  for (const h of hexes) {
    const cx = h.cx + shiftX;
    const cy = h.cy + shiftY;

    const points = hexagonPoints(cx, cy, HEX_RADIUS);
    const fill = getWorldFill(h.worldType);
    
    elements.push(
      `  <g id="hex-group-${h.id}" data-hex="${h.id}" data-col="${h.col}" data-row="${h.row}" data-world-type="${h.worldType}">`,
      `    <polygon`,
      `      id="hex-${h.id}"`,
      `      class="hex ${cssWorldTypeClass(h.worldType)}"`,
      `      points="${points}"`,
      `      fill="${fill}"`,
      `      stroke="${config.hexBorder.color}"`,
      `      stroke-width="2"`,
      `    />`,
      `    <text`,
      `      id="label-${h.id}"`,
      `      class="hex-label"`,
      `      x="${cx}"`,
      `      y="${cy + 4}"`,
      `      text-anchor="middle"`,
      `      font-size="11"`,
      `      fill="#111"`,
      `    >${h.id}</text>`,
      `  </g>`
    );
  }

  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg`,
    `  xmlns="http://www.w3.org/2000/svg"`,
    `  width="${width}"`,
    `  height="${height}"`,
    `  viewBox="0 0 ${width} ${height}"`,
    `>`,
    `  <defs>`,
    ...defs.map(d => `    ${d}`),
    `  </defs>`,
    ...bg.map(b => `  ${b}`),
    `  <style>`,
    ...styles.map(s => `    ${s}`),
    `  </style>`,
    ...elements,
    `</svg>`,
    ``
  ].join("\n");

  return svg;
}

/* ───────── Geometry helpers ───────── */

function hexagonPoints(cx: number, cy: number, r: number): string {
  const angles = [0, 60, 120, 180, 240, 300];
  return angles.map(deg => {
    const rad = (deg * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

/* ───────── Styling helpers ───────── */

function cssWorldTypeClass(type: WorldType): string {
  return type.toLowerCase();
}

/* ───────── Run ───────── */
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  generateBoardSvgs().catch(console.error);
}
