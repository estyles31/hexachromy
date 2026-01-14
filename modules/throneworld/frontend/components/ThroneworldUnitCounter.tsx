// /modules/throneworld/frontend/components/ThroneworldUnitCounter.tsx
import { Glyph } from "../../../../shared-frontend/glyphs/Glyph";
import type { ThroneworldUnitType } from "../../shared/models/Units.Throneworld";

interface UnitCounterProps {
  unit: ThroneworldUnitType;
  quantity: number;
  size?: number;
  hasMoved: boolean;
  playerColor: string;
  highlighted?: boolean;
  selected?: boolean;
}

export default function UnitCounter({
  unit,
  quantity,
  size = 32,
  hasMoved,
  playerColor,
  highlighted = false,
  selected = false,
}: UnitCounterProps) {
  const { id: unitId, Glyph: glyph, Domain: Type, Cargo: cargo = null } = unit;

  const isSpace = Type === "Space";
  const domainColor = isSpace ? "#6ca2faff" : "#ff8940ff"; // blue/orange ring

  const borderWidth = 2;

  // Sizing
  const mainIconSize = size * 0.9;
  const badgeRadius = size * 0.16;
  const badgeFont = size * 0.24;

  // Cargo style
  let cargoFill = cargo && cargo > 0 ? "#abebc6ff" : "#ffbdcfff";
  if (cargo === 0 || cargo === null) cargoFill = "transparent";

  // Highlight/selection styling
  const highlightStroke = highlighted ? "yellow" : undefined;
  const highlightStrokeWidth = highlighted ? 3 : 0;
  const selectedStroke = selected ? "white" : undefined;
  const selectedStrokeWidth = selected ? 4 : 0;

  return (
    <svg width={size + 6} height={size + 6} className="game-object">
      {/* Selection glow (behind everything) */}
      {selected && (
        <rect
          x={3}
          y={3}
          width={size}
          height={size}
          rx={6}
          fill="none"
          stroke={selectedStroke}
          strokeWidth={selectedStrokeWidth}
          filter="url(#glow)"
        />
      )}

      {/* Highlight ring (behind counter) */}
      {highlighted && !selected && (
        <rect
          x={1}
          y={1}
          width={size + 4}
          height={size + 4}
          rx={6}
          fill="none"
          stroke={highlightStroke}
          strokeWidth={highlightStrokeWidth}
          opacity={0.8}
        />
      )}

      {/* Base counter shape (player color) */}
      <rect
        x={3}
        y={3}
        width={size}
        height={size}
        rx={4}
        fill={playerColor}
        stroke="#000"
        strokeWidth={borderWidth}
        opacity={hasMoved ? 0.65 : 1.0}
      />

      {/* Unit Icon (center) */}
      <g transform={`translate(${size * 0.52 + 3}, ${size * 0.53 + 3})`} opacity={hasMoved ? 0.75 : 1.0}>
        <Glyph color="#fff" outlineColor="#000" size={mainIconSize} glyph={glyph} />
      </g>

      {/* Diagonal "moved" X */}
      {hasMoved && (
        <>
          <line x1={3} y1={3} x2={size + 3} y2={size + 3} stroke="#000" strokeWidth={3} opacity={0.4} />
          <line x1={3} y1={size + 3} x2={size + 3} y2={3} stroke="#000" strokeWidth={3} opacity={0.4} />
        </>
      )}

      {/* UNIT ID with DOMAIN RING */}
      {unitId !== "fleet" && (
        <>
          <circle
            cx={badgeRadius * 1.1 + 2}
            cy={badgeRadius * 1.1 + 2}
            r={badgeRadius * 1.2}
            fill={domainColor}
            stroke={domainColor}
            strokeWidth={2}
          />
          <text
            x={badgeRadius * 1.1 + 2}
            y={badgeRadius * 1.1 + 3}
            fontSize={badgeFont * 1.2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#000"
            fontWeight="bold"
          >
            {unitId}
          </text>
        </>
      )}

      {/* QUANTITY BADGE (lower-left) */}
      {quantity > 1 && (
        <>
          <circle
            cx={badgeRadius + 3}
            cy={size - badgeRadius + 3}
            r={badgeRadius}
            fill={domainColor}
            stroke="#fff"
            strokeWidth={1}
          />
          <text
            x={badgeRadius + 3}
            y={size - badgeRadius + 4}
            fontSize={badgeFont}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#000"
            fontWeight="bold"
          >
            {quantity}
          </text>
        </>
      )}

      {/* CARGO BADGE (lower-right) */}
      {cargo !== null && cargo !== 0 && (
        <>
          <circle
            cx={size - badgeRadius + 3}
            cy={size - badgeRadius + 3}
            r={badgeRadius}
            fill={cargoFill}
            stroke="#fff"
            strokeWidth={1.3}
          />
          <text
            x={size - badgeRadius + 3}
            y={size - badgeRadius + 4}
            fontSize={badgeFont}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#000"
            fontWeight="bold"
          >
            {cargo > 0 ? `+${cargo * quantity}` : cargo * quantity}
          </text>
        </>
      )}

      {/* SVG filter for glow effect */}
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
