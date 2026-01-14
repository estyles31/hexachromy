import React from "react";
import type { GlyphDef } from "../../shared/data/icoMoon";
import tinycolor from "tinycolor2";

/* ────────────────────────────────────────────── */
/* Types */

export type GlyphMode = "auto" | "svg" | "font" | "unicode";

export interface GlyphProps {
  glyph?: GlyphDef;

  host?: "svg" | "html"; // default: "svg"
  mode?: GlyphMode; // default: "auto"

  /** Explicit fill color */
  color?: string;

  /** Background color for auto fill selection */
  backgroundColor?: string;

  /** Size in CSS px */
  size?: number;

  /** SVG-only */
  anchor?: "center" | "top-left";

  /** Outline thickness as fraction of size (default ≈10%) */
  outlineRatio?: number;

  /** Explicit outline color (overrides auto) */
  outlineColor?: string;

  outlineStyle?: "single" | "double-bg" | "double-fill" | "none";
}

/* ────────────────────────────────────────────── */
/* SVG icon loading */

const SVG_ICONS = import.meta.glob("../../shared-frontend/glyphs/svg/*.svg", {
  eager: true,
  query: "?react",
  import: "default",
}) as Record<string, React.FC<React.SVGProps<SVGSVGElement>>>;

const SVG_ICON_MAP: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {};

for (const [path, mod] of Object.entries(SVG_ICONS)) {
  const name = path
    .split("/")
    .pop()!
    .replace(/\.svg$/, "");
  SVG_ICON_MAP[name] = mod;
}

function resolveSvgIcon(name?: string) {
  const icon = name ? SVG_ICON_MAP[name] : undefined;
  if (name && !icon) {
    console.log("Icon not found: ", name);
  }
  return icon;
}

/* ────────────────────────────────────────────── */
/* Color utilities */

function idealFillForBackground(backgroundColor: string): "#000" | "#fff" {
  const bg = tinycolor(backgroundColor);
  if (!bg.isValid()) return "#000";

  return bg.getLuminance() > 0.7 ? "#000" : "#fff";
}

function resolveGlyphColors(
  color: string | undefined,
  outlineColor: string | undefined,
  backgroundColor: string | undefined,
  outlineStyle: "single" | "double-bg" | "double-fill" | "none"
): { fill?: string; outlineInner?: string; outlineOuter?: string } {
  let outlineInner, outlineOuter;

  if (outlineStyle != "none") {
    if (outlineStyle == "double-bg") {
      // if we're contrasting the background, assume they gave us the inner outline or nothing
      const contrastTarget = backgroundColor ?? outlineColor ?? (color ? idealFillForBackground(color) : "#000");

      outlineOuter = idealFillForBackground(contrastTarget);
      outlineInner = outlineColor ?? idealFillForBackground(outlineOuter);
    } else if (outlineStyle == "double-fill") {
      //if we're contrasting the fill, assume they gave us the outer outline or nothing
      const contrastTarget =
        color ?? outlineColor ?? (backgroundColor ? idealFillForBackground(backgroundColor) : "#fff");

      outlineInner = idealFillForBackground(contrastTarget);
      outlineOuter = outlineColor ?? idealFillForBackground(outlineInner);
    } else {
      //single
      outlineOuter = undefined;
      outlineInner =
        outlineColor ??
        (backgroundColor ? idealFillForBackground(backgroundColor) : color ? idealFillForBackground(color) : undefined);
      // console.log(
      //   "backgroundColor: %s, outlineInner: %s, idealFillForBackground: %s",
      //   backgroundColor,
      //   outlineInner,
      //   idealFillForBackground(backgroundColor!)
      // );
    }
  }

  if (color) {
    return {
      fill: color,
      outlineInner,
      outlineOuter,
    };
  }

  if (backgroundColor || outlineInner) {
    const contrastTarget = outlineInner ?? backgroundColor ?? "#fff";
    const fill = idealFillForBackground(contrastTarget);
    return {
      fill,
      outlineInner,
      outlineOuter,
    };
  }

  return { fill: color, outlineInner, outlineOuter };
}

/* ────────────────────────────────────────────── */
/* Mode resolution */

function resolveMode(mode: GlyphMode, glyph: GlyphDef): GlyphMode {
  if (mode !== "auto") return mode;
  if (glyph.icon) return "svg";
  if (glyph.codepoint) return "font";
  if (glyph.unicode) return "unicode";
  return "unicode";
}

/* ────────────────────────────────────────────── */
/* SVG renderer */

function GlyphSvgIcon({
  Icon,
  size,
  fill,
  outlineInner,
  outlineOuter,
  outlineRatio,
}: {
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  size: number;
  fill?: string;
  outlineInner?: string;
  outlineOuter?: string;
  outlineRatio: number;
}) {
  const baseStroke = size * outlineRatio;

  return (
    <>
      <style>{`
        .hx-outline * {
          vector-effect: non-scaling-stroke;
          fill: none !important;
          stroke-linejoin: round;
          stroke-linecap: round;
        }
        .hx-fill * {
          stroke: none !important;
        }
      `}</style>

      {/* Outer outline */}
      {outlineOuter && (
        <Icon
          className="hx-outline"
          width={size}
          height={size}
          stroke={outlineOuter}
          strokeWidth={baseStroke * 2}
          style={{ overflow: "visible" }}
        />
      )}

      {/* Inner outline */}
      {outlineInner && (
        <Icon
          className="hx-outline"
          width={size}
          height={size}
          stroke={outlineInner}
          strokeWidth={baseStroke}
          style={{ overflow: "visible" }}
        />
      )}

      <Icon
        className="hx-fill"
        width={size}
        height={size}
        style={{ overflow: "visible", ...(fill ? ({ color: fill } as React.CSSProperties) : {}) }}
        fill={fill ?? "currentColor"}
      />
    </>
  );
}

/* ────────────────────────────────────────────── */
/* Main component */

export function Glyph({
  glyph,
  host = "svg",
  mode = "auto",
  color,
  backgroundColor,
  size = 16,
  anchor = "center",
  outlineRatio = 0.1,
  outlineColor,
  outlineStyle = "single",
}: GlyphProps) {
  if (!glyph) return null;

  const effectiveMode = resolveMode(mode, glyph);
  // console.log(
  //   "glyph: %s, color: %s, backgroundColor: %s, outlineColor: %s, outlineStyle: %s",
  //   glyph.icon,
  //   color,
  //   backgroundColor,
  //   outlineColor,
  //   outlineStyle
  // );
  const { fill, outlineInner, outlineOuter } = resolveGlyphColors(color, outlineColor, backgroundColor, outlineStyle);
  //console.log("fill: %s, outer: %s, inner: %s", fill, outlineInner, outlineOuter);

  /* ───────────── SVG HOST ───────────── */
  if (host === "svg") {
    if (effectiveMode === "svg" && glyph.icon) {
      const Icon = resolveSvgIcon(glyph.icon);
      const transform = anchor === "center" ? `translate(${-size / 2}, ${-size / 2})` : undefined;

      if (Icon) {
        return (
          <g transform={transform}>
            <GlyphSvgIcon
              Icon={Icon}
              size={size}
              fill={fill}
              outlineInner={outlineInner}
              outlineOuter={outlineOuter}
              outlineRatio={outlineRatio}
            />
          </g>
        );
      }
    }

    if (effectiveMode === "font" && glyph.codepoint) {
      return (
        <tspan fill={fill ?? "currentColor"} fontFamily="hexachromy-glyphs">
          {glyph.codepoint}
        </tspan>
      );
    }

    return <tspan fill={fill ?? "currentColor"}>{glyph.unicode ?? "?"}</tspan>;
  }

  /* ───────────── HTML HOST ───────────── */
  if (effectiveMode === "svg" && glyph.icon) {
    const Icon = resolveSvgIcon(glyph.icon);
    if (Icon) {
      return (
        <svg width={size} height={size} style={{ verticalAlign: "middle", overflow: "visible" }}>
          <GlyphSvgIcon
            Icon={Icon}
            size={size}
            fill={fill}
            outlineInner={outlineInner}
            outlineOuter={outlineOuter}
            outlineRatio={outlineRatio}
          />
        </svg>
      );
    }
  }

  if (effectiveMode === "font" && glyph.codepoint) {
    return (
      <span className="glyph icon" style={fill ? { color: fill } : undefined}>
        {glyph.codepoint}
      </span>
    );
  }

  return (
    <span className="glyph icon" style={fill ? { color: fill } : undefined}>
      {glyph.unicode ?? "?"}
    </span>
  );
}
