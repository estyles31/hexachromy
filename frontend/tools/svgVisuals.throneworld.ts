// /hexachromy/tools/svgVisuals.throneworld.ts

import type { WorldType } from "../../shared/models/BoardLayout.ThroneWorld.ts";
import visuals from "../../shared/data/boardVisuals.throneworld.json" with { type: "json" };

type GradientStop = {
  offset: string;
  color: string;
  opacity?: number;
};

type LinearGradientDef = {
  id: string;
  stops: GradientStop[];
};

type RadialGradientDef = {
  id: string;
  radial: true;
  stops: GradientStop[];
};

type PatternCircle = {
  cx: number;
  cy: number;
  r: number;
  opacity: number;
};

type BackgroundVisuals = {
  gradient: RadialGradientDef;
  stars: {
    id: string;
    width: number;
    height: number;
    circles: PatternCircle[];
  };
};

type VisualConfig = {
  background: BackgroundVisuals;
  worldGradients: Partial<Record<WorldType, LinearGradientDef>>;
  hexBorder: {
    color: string
  }
};

export const config = visuals as VisualConfig;

/* ───────── Exported helpers ───────── */

export function buildDefs(): string[] {
  const defs: string[] = [];

  const bg = config.background;

  // Space gradient
  defs.push(
    `<radialGradient id="${bg.gradient.id}" cx="50%" cy="50%" r="70%">`
  );
  for (const stop of bg.gradient.stops) {
    const opacity = stop.opacity !== undefined
                        ? ` stop-opacity="${stop.opacity}"`
                        : "";

    defs.push(`  <stop offset="${stop.offset}" stop-color="${stop.color}"${opacity}/>`);
  }
  defs.push(`</radialGradient>`);

  // Star pattern
  const stars = bg.stars;
  defs.push(
    `<pattern id="${stars.id}" width="${stars.width}" height="${stars.height}" patternUnits="userSpaceOnUse">`
  );
  for (const star of stars.circles) {
    defs.push(
      `  <circle cx="${star.cx}" cy="${star.cy}" r="${star.r}" fill="white" opacity="${star.opacity}"/>`
    );
  }
  defs.push(`</pattern>`);

  // World gradients
  for (const grad of Object.values(config.worldGradients)) {
    if (!grad) continue;
    defs.push(
      `<linearGradient id="${grad.id}" x1="0%" y1="0%" x2="100%" y2="100%">`
    );
    for (const stop of grad.stops) {
      defs.push(
        `  <stop offset="${stop.offset}" stop-color="${stop.color}"/>`
      );
    }
    defs.push(`</linearGradient>`);
  }

  return defs;
}

export function getWorldFill(type: WorldType): string {
  const grad = config.worldGradients[type];
  if (!grad) {
    if (type === "NotInPlay") return "transparent";
    return "#333";
  }
  return `url(#${grad.id})`;
}

export function getBackgroundRects(): string[] {
  return [
    `<rect x="0" y="0" width="100%" height="100%" fill="url(#${config.background.gradient.id})" />`,
    `<rect x="0" y="0" width="100%" height="100%" fill="url(#${config.background.stars.id})" />`
  ];
}

export function getBaseStyles(): string[] {
  return [
    `.hex { cursor: pointer; transition: stroke 0.15s ease, fill 0.15s ease; }`,
    `.hex-label { pointer-events: none; font-family: sans-serif; }`,
    `.hex:hover { stroke: #ffffff; stroke-width: 3; }`
  ];
}
