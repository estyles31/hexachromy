// import React from "react";
import type { ThroneworldUnit } from "../../shared/models/UnitType.ThroneWorld";
import { counterStyles } from "../config/counterStyles.ts";

interface UnitCounterProps {
  unit: ThroneworldUnit;
  quantity?: number;
  size?: number;
}

export function UnitCounter({ unit, quantity = 1, size = 64 } : UnitCounterProps) {
  const { id: unitId, Symbol: glyph, Type, Cargo: cargo = null } = unit;

  // Look up style from JSON
  const styleKey = Type.toLowerCase() as keyof typeof counterStyles;
  const style = counterStyles[styleKey];

  const background = style.background;
  const borderColor = style.border;
  const textColor = style.text;

  const borderWidth = 2;

  // Sizing
  const fontSizeSymbol = size * 0.55;
  const fontSizeId = size * 0.22;
  const fontSizeCargo = size * 0.20;
  const badgeRadius = size * 0.18;

  return (
    <svg width={size} height={size}>
      {/* Background */}
      <rect
        x={0}
        y={0}
        width={size}
        height={size}
        rx={5}
        fill={background}
        stroke={borderColor}
        strokeWidth={borderWidth}
      />

      {/* Symbol (centered) */}
      <text
        x="50%"
        y="56%"
        fontSize={fontSizeSymbol}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
      >
        {glyph}
      </text>

      {/* Unit ID top-left */}
      <text
        x={size * 0.14}
        y={size * 0.25}
        fontSize={fontSizeId}
        fontWeight="bold"
        fill={textColor}
      >
        {unitId}
      </text>

      {/* Cargo indicator */}
      {cargo !== null && cargo !== 0 && (
        <text
          x={size * 0.14}
          y={size * 0.90}
          fontSize={fontSizeCargo}
          fill={textColor}
        >
          {cargo > 0 ? `+${cargo}` : cargo}
        </text>
      )}

      {/* Quantity badge */}
      {quantity > 1 && (
        <>
          <circle
            cx={size - badgeRadius * 1.15}
            cy={badgeRadius * 1.15}
            r={badgeRadius}
            fill={textColor}
            stroke={borderColor}
            strokeWidth={1.5}
          />
          <text
            x={size - badgeRadius * 1.15}
            y={badgeRadius * 1.15 + 1}
            fontSize={fontSizeCargo}
            fontWeight="bold"
            dominantBaseline="middle"
            textAnchor="middle"
            fill={background}  /* invert for contrast */
          >
            {quantity}
          </text>
        </>
      )}
    </svg>
  );
}