// /hexachromy/modules/throneworld/frontend/tools/generateBoardSvg.ts

import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

import { buildDefs, getWorldFill, getBackgroundRects, getBaseStyles, config }
  from "./svgVisuals.throneworld";

import {
  BOARD_HEXES,
  scenarioIds,
  type WorldType
} from "../../shared/models/BoardLayout.ThroneWorld";

import { 
  computeBoardGeometry 
} from "../../shared/models/BoardGeometry.ThroneWorld";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  // Use the same geometry calculation as the game runtime
  const geometry = computeBoardGeometry(scenarioId);

  const defs = buildDefs();
  const bg = getBackgroundRects(geometry.width, geometry.height);
  const styles = getBaseStyles();

  const elements: string[] = [];

  // Render each hex from the computed geometry
  for (const [hexId, hex] of Object.entries(geometry.hexes)) {
    const points = hexagonPoints(hex.x, hex.y, geometry.hexRadius);
    const fill = getWorldFill(hex.worldType);
    
    // Get original hex data for metadata
    const originalHex = BOARD_HEXES.find(h => h.id === hexId);
    if (!originalHex) continue;
    
    elements.push(
      `  <g id="hex-group-${hexId}" data-hex="${hexId}" data-col="${originalHex.col}" data-row="${originalHex.row}" data-world-type="${hex.worldType}">`,
      `    <polygon`,
      `      id="hex-${hexId}"`,
      `      class="hex ${cssWorldTypeClass(hex.worldType)}"`,
      `      points="${points}"`,
      `      fill="${fill}"`,
      `      stroke="${config.hexBorder.color}"`,
      `      stroke-width="2"`,
      `    />`,
      `    <text`,
      `      id="label-${hexId}"`,
      `      class="hex-label"`,
      `      x="${hex.x}"`,
      `      y="${hex.y + 4}"`,
      `      text-anchor="middle"`,
      `      font-size="11"`,
      `      fill="#111"`,
      `    >${hexId}</text>`,
      `  </g>`
    );
  }

  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg`,
    `  xmlns="http://www.w3.org/2000/svg"`,
    `  width="${geometry.width}"`,
    `  height="${geometry.height}"`,
    `  viewBox="0 0 ${geometry.width} ${geometry.height}"`,
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