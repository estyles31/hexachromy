// /modules/throneworld/frontend/components/ThroneworldUnitCounter.tsx
import type { ThroneworldUnitType } from "../../shared/models/UnitType.ThroneWorld";

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
  const { id: unitId, Symbol: glyph, Type, Cargo: cargo = null } = unit;

  const isSpace = Type === "Space";
  const domainColor = isSpace ? "#3f89ffff" : "#ff9a5bff"; // blue/orange ring

  const borderWidth = 2;

  // Sizing
  const fontSizeSymbol = size * 0.55;
  const fontSizeId = size * 0.24;
  const badgeRadius = size * 0.2;
  const badgeFont = size * 0.22;

  const cargoRadius = size * 0.22;
  const cargoFont = size * 0.22;

  // Visual indicators for moved/used units
  const isCommandBunker = unitId === "C";   //todo: maybe change to check "Command" value
  const showMovedIndicator = hasMoved && !isCommandBunker;
  const showUsedIndicator = hasMoved && isCommandBunker;

  // Cargo style
  let cargoFill = cargo && cargo > 0 ? "#abebc6ff" : "#ea95c2ff";
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
        opacity={showMovedIndicator ? 0.65 : 1.0}
      />

      {/* Diagonal "moved" stripe */}
      {showMovedIndicator && (
        <line
          x1={3}
          y1={3}
          x2={size + 3}
          y2={size + 3}
          stroke="#000"
          strokeWidth={3}
          opacity={0.4}
        />
      )}

      {/* UNIT SYMBOL (center) */}
      <text
        x={size * 0.55 + 3}
        y={size * 0.55 + 3}
        fontSize={fontSizeSymbol}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        opacity={showMovedIndicator ? 0.75 : 1.0}
      >
        {glyph}
      </text>

      {/* UNIT ID with DOMAIN RING */}
      <circle
        cx={size * 0.2 + 3}
        cy={size * 0.22 + 3}
        r={size * 0.16}
        fill={domainColor}
        stroke={domainColor}
        strokeWidth={2}
      />
      <text
        x={size * 0.2 + 3}
        y={size * 0.22 + 3}
        fontSize={fontSizeId}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#000"
        fontWeight="bold"
      >
        {unitId}
      </text>

      {/* QUANTITY BADGE (lower-left) */}
      {quantity > 1 && (
        <>
          <circle
            cx={size * 0.22 + 3}
            cy={size * 0.78 + 3}
            r={badgeRadius}
            fill={domainColor}
            stroke="#fff"
            strokeWidth={1}
          />
          <text
            x={size * 0.22 + 3}
            y={size * 0.78 + 4}
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
            cx={size * 0.78 + 3}
            cy={size * 0.78 + 3}
            r={cargoRadius}
            fill={cargoFill}
            stroke="#fff"
            strokeWidth={1.3}
          />
          <text
            x={size * 0.78 + 3}
            y={size * 0.78 + 4}
            fontSize={cargoFont}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#000"
            fontWeight="bold"
          >
            {cargo > 0 ? `+${cargo}` : cargo}
          </text>
        </>
      )}

      {/* Used indicator for command bunkers */}
      {showUsedIndicator && (
        <circle
          cx={size * 0.85 + 3}
          cy={size * 0.18 + 3}
          r={size * 0.12}
          fill="red"
          stroke="black"
          strokeWidth={1}
        />
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