import type { ThroneworldUnitType } from "../../shared/models/UnitType.ThroneWorld";
import { counterStyles } from "../config/counterStyles";

interface UnitCounterProps {
  unit: ThroneworldUnitType;
  quantity: number;
  size?: number;
  hasMoved: boolean;
  playerColor: string;
}

export default function UnitCounter({
  unit,
  quantity,
  size = 32,
  hasMoved,
  playerColor,      
}: UnitCounterProps) {
  const { id: unitId, Symbol: glyph, Type, Cargo: cargo = null} = unit;

  const isSpace = Type === "Space";
  const domainColor = isSpace ? "#1766e5ff" : "#e1854cff"; // blue/orange ring

  const borderWidth = 2;

  // Sizing
  const fontSizeSymbol = size * 0.55;
  const fontSizeId = size * 0.24;
  const badgeRadius = size * 0.22;
  const badgeFont = size * 0.22;

  const cargoRadius = size * 0.22;
  const cargoFont = size * 0.22;

  // Visual indicators for moved/used units
  const isCommandBunker = unitId === "C" || unitId === "qC";
  const showMovedIndicator = hasMoved && !isCommandBunker;
  const showUsedIndicator = hasMoved && isCommandBunker;

  // Cargo style
  let cargoFill = cargo && cargo > 0 ? "#c0f9d8ff" : "#df71acff"; // greenish for +, reddish for -
  if (cargo === 0 || cargo === null) cargoFill = "transparent";

  return (
    <svg width={size} height={size}>
      {/* Base counter shape (player color) */}
      <rect
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
          x1={0}
          y1={0}
          x2={size}
          y2={size}
          stroke="#000"
          strokeWidth={3}
          opacity={0.4}
        />
      )}

      {/* UNIT SYMBOL (center) */}
      <text
        x="50%"
        y="54%"
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
        cx={size * 0.20}
        cy={size * 0.22}
        r={size * 0.16}
        fill="white"
        stroke={domainColor}
        strokeWidth={2}
      />
      <text
        x={size * 0.20}
        y={size * 0.22}
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
            cx={size * 0.22}
            cy={size * 0.78}
            r={badgeRadius}
            fill="#000"
            stroke="white"
            strokeWidth={1.3}
          />
          <text
            x={size * 0.22}
            y={size * 0.78 + 1}
            fontSize={badgeFont}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
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
            cx={size * 0.78}
            cy={size * 0.78}
            r={cargoRadius}
            fill={cargoFill}
            stroke="white"
            strokeWidth={1.3}
          />
          <text
            x={size * 0.78}
            y={size * 0.78 + 1}
            fontSize={cargoFont}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontWeight="bold"
          >
            {cargo > 0 ? `+${cargo}` : cargo}
          </text>
        </>
      )}

      {/* Used indicator for command bunkers */}
      {showUsedIndicator && (
        <circle
          cx={size * 0.85}
          cy={size * 0.18}
          r={size * 0.12}
          fill="red"
          stroke="black"
          strokeWidth={1}
        />
      )}
    </svg>
  );
}
