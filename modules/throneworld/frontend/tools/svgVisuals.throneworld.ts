// /hexachromy/tools/svgVisuals.throneworld.ts

import type { WorldType } from "../../shared/models/BoardLayout.Throneworld";
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

type NoiseConfig = {
  enabled: boolean;
  deterministic: boolean;
  seed?: number;
  baseFrequency: number;
  octaves: number;
  opacity: number;
};

type RandomStarsConfig = {
  enabled: boolean;
  deterministic: boolean;
  seed?: number;
  count: number;
  minRadius: number;
  maxRadius: number;
  minOpacity: number;
  maxOpacity: number;
};

type BackgroundVisuals = {
  gradient: RadialGradientDef;
  stars: {
    id: string;
    enabled: boolean;
    width: number;
    height: number;
    circles: PatternCircle[];
  };
  noise?: NoiseConfig;
  randomStars?: RandomStarsConfig;
};

type VisualConfig = {
  background: BackgroundVisuals;
  worldGradients: Partial<Record<WorldType, LinearGradientDef>>;
  hexBorder: {
    color: string;
  };
};

export const config = visuals as VisualConfig;

/* ───────── Exported helpers ───────── */

export function buildDefs(): string[] {
  const defs: string[] = [];

  const bg = config.background;

  // Space gradient
  defs.push(`<radialGradient id="${bg.gradient.id}" cx="50%" cy="50%" r="70%">`);
  for (const stop of bg.gradient.stops) {
    const opacity = stop.opacity !== undefined ? ` stop-opacity="${stop.opacity}"` : "";

    defs.push(`  <stop offset="${stop.offset}" stop-color="${stop.color}"${opacity}/>`);
  }
  defs.push(`</radialGradient>`);

  // Star pattern
  if (bg.stars.enabled) {
    defs.push(
      `<pattern id="${bg.stars.id}" width="${bg.stars.width}" height="${bg.stars.height}" patternUnits="userSpaceOnUse">`
    );
    for (const star of bg.stars.circles) {
      defs.push(`  <circle cx="${star.cx}" cy="${star.cy}" r="${star.r}" fill="white" opacity="${star.opacity}"/>`);
    }
    defs.push(`</pattern>`);
  }

  // World gradients
  for (const grad of Object.values(config.worldGradients)) {
    if (!grad) continue;
    defs.push(`<linearGradient id="${grad.id}" x1="0%" y1="0%" x2="100%" y2="100%">`);
    for (const stop of grad.stops) {
      defs.push(`  <stop offset="${stop.offset}" stop-color="${stop.color}"/>`);
    }
    defs.push(`</linearGradient>`);
  }

  // Optional turbulence noise
  if (bg.noise?.enabled) {
    const seedAttr = bg.noise.deterministic && typeof bg.noise.seed === "number" ? ` seed="${bg.noise.seed}"` : "";

    defs.push(
      `<filter id="spaceNoise">`,
      `  <feTurbulence`,
      `    type="fractalNoise"`,
      `    baseFrequency="${bg.noise.baseFrequency}"`,
      `    numOctaves="${bg.noise.octaves}"`,
      `${seedAttr}`,
      `  />`,
      `  <feColorMatrix type="saturate" values="0"/>`,
      `  <feComponentTransfer>`,
      `    <feFuncR type="gamma" amplitude="${bg.noise.opacity}" exponent="2"/>`,
      `    <feFuncG type="gamma" amplitude="${bg.noise.opacity}" exponent="2"/>`,
      `    <feFuncB type="gamma" amplitude="${bg.noise.opacity}" exponent="2"/>`,
      `  </feComponentTransfer>`,
      `</filter>`
    );
  }

  return defs;
}

function getRandomStars(width: number, height: number): string[] {
  const cfg = config.background.randomStars;
  if (!cfg || !cfg.enabled || cfg.count <= 0) return [];

  const rand = cfg.deterministic && typeof cfg.seed === "number" ? mulberry32(cfg.seed) : Math.random;

  const stars: string[] = [];

  for (let i = 0; i < cfg.count; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const r = cfg.minRadius + (cfg.maxRadius - cfg.minRadius) * rand();
    const opacity = cfg.minOpacity + (cfg.maxOpacity - cfg.minOpacity) * rand();

    stars.push(
      `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(
        2
      )}" fill="white" opacity="${opacity.toFixed(2)}"/>`
    );
  }

  return stars;
}

// Simple deterministic PRNG (mulberry32)
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function getWorldFill(type: WorldType): string {
  const grad = config.worldGradients[type];
  if (!grad) {
    if (type === "NotInPlay") return "transparent";
    return "#333";
  }
  return `url(#${grad.id})`;
}

export function getBackgroundRects(width: number, height: number): string[] {
  const bg = config.background;

  const layers: string[] = [
    `<rect width="100%" height="100%" fill="url(#${bg.gradient.id})"/>`,
    `<rect width="100%" height="100%" fill="url(#${bg.stars.id})"/>`,
  ];

  // Add randomized stars ON TOP of background layers
  layers.push(...getRandomStars(width, height));

  return layers;
}

export function getBaseStyles(): string[] {
  return [
    `.hex { cursor: pointer; transition: stroke 0.15s ease, fill 0.15s ease; }`,
    `.hex-label { pointer-events: none; font-family: sans-serif; }`,
    `.hex:hover { stroke: #ffffff; stroke-width: 3; }`,
  ];
}
