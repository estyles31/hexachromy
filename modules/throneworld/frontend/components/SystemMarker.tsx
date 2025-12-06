import { systemStyles } from "../config/systemStyles";
import type { SystemDefinition } from "../../shared/models/Systems.ThroneWorld";
import { UNITS, type UnitId } from "../../shared/models/UnitTypes.ThroneWorld";

interface Props {
  system: SystemDefinition;
  worldType: string;     // "outer" | "inner" | "fringe" | "throneworld" | "homeworld"
  ownerColor?: string;
  size?: number;         // default 72px
  revealed?: boolean;
}

export default function SystemMarker({ system, worldType, ownerColor, size = 72, revealed = true }: Props) {

    worldType = worldType.toLowerCase();
    const styleKey = worldType as keyof typeof systemStyles;
    const style = systemStyles[styleKey] ?? systemStyles.default;
    // const pad = size * 0.12;

    revealed = revealed || worldType == "homeworld";
    const typeLabel = worldType.charAt(0).toUpperCase() + "W";
    
    //
    // FOGGED VERSION (non-homeworld only)
    //
    if (!revealed) {
        return (
            <svg width={size} height={size}>
                <rect
                    width={size}
                    height={size}
                    rx={6}
                    fill={style.fog}
                    stroke="black"
                    strokeWidth={2}
                />
                <text
                    x="50%"
                    y="55%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={size * 0.50}
                    fill="#777"
                >
                    {typeLabel}
                </text>
            </svg>
        );
    }

    
    const spaceGlyphs = flattenUnits(system.spaceUnits);
    const groundGlyphs = flattenUnits(system.groundUnits);

    const techLabelParts: string[] = [];
    if (system.spaceTech > 0) techLabelParts.push(`S${system.spaceTech}`);
    if (system.groundTech > 0) techLabelParts.push(`G${system.groundTech}`);
    const techLabel = techLabelParts.join(" ");

  return (
    <svg width={size} height={size}>
      {/* Background */}
      <rect
        width={size}
        height={size}
        rx={6}
        fill={style.background}
        stroke={style.border}
        strokeWidth={3}
      />

      {/* Owner badge (top-left) */}
      {ownerColor && (
        <circle
          cx={size * 0.18}
          cy={size * 0.18}
          r={size * 0.12}
          fill={ownerColor}
          stroke="black"
          strokeWidth={1.5}
        />
      )}

      {/* Tech levels (top-right, small) */}
      {techLabel && worldType != "homeworld" && (
        <text
          x={size * 0.86}
          y={size * 0.22}
          textAnchor="end"
          fontSize={size * 0.18}
          fill={style.text}
        >
          {techLabel}
        </text>
      )}

      {/* Development value (center) */}
      <text
        x="50%"
        y={size * 0.32}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.45}
        fontWeight="bold"
        fill={style.text}
      >
        {system.dev}
      </text>

      {/* Space defenders (middle row) */}
      {spaceGlyphs.length > 0 && (
        <text
          x="50%"
          y={size * 0.60}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.22}
          fill={style.text}
        >
          {spaceGlyphs.join(" ")}
        </text>
      )}

      {/* Ground defenders (bottom row above label) */}
      {groundGlyphs.length > 0 && (
        <text
          x="50%"
          y={size * 0.80}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.22}
          fill={style.text}
        >
          {groundGlyphs.join(" ")}
        </text>
      )}

      {/* System type label at bottom */}
      <text
        x="50%"
        y={size * 0.95}
        textAnchor="middle"
        fontSize={size * 0.20}
        fill={style.text}
      >
        {typeLabel}
      </text>
    </svg>
  );
}

// Convert { "F": 2, "L": 1 } to ["⯈", "⯈", "⦿"]
function flattenUnits(unitMap: Partial<Record<UnitId, number>>): string[] {
  const arr: string[] = [];
  for (const [unitId, count] of Object.entries(unitMap)) {
    const glyph = UNITS[unitId]?.Symbol ?? "?";
    if(count && count > 0) {
        for (let i = 0; i < count; i++) arr.push(glyph);
    }
  }
  return arr;
}
