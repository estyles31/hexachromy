import { systemStyles } from "../config/systemStyles";
import type { SystemDefinition } from "../../shared/models/Systems.ThroneWorld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";

interface Props {
  system: SystemDefinition;
  worldType: string;
  ownerColor?: string;
  size?: number;
  revealed?: boolean;
  onHover?: (isHovering: boolean) => void;
}

// Layout configuration - all positioning as ratios of marker size
const LAYOUT = {
  // Owner badge in top-left corner
  ownerBadge: {
    cx: 0.15,
    cy: 0.15,
    radius: 0.11,
    strokeWidth: 1.5,
  },
  
  // Development value (large number at top)
  devValue: {
    y: 0.30,
    fontSize: 0.5,
  },
  
  // Space units column (left side, bottom-aligned)
  spaceColumn: {
    x: 0.01,
    bottomPadding: 0.10,  // padding from bottom of marker
    lineHeight: 0.18,     // spacing between each line
    techFontSize: 0.18,
    glyphFontSize: 0.18,
    countFontSize: 0.18,
  },
  
  // Ground units column (right side, bottom-aligned)
  groundColumn: {
    x: 0.99,              // right-aligned
    bottomPadding: 0.10,
    lineHeight: 0.18,
    techFontSize: 0.18,
    glyphFontSize: 0.18,
    countFontSize: 0.18,
  },
  
  // Fogged version
  fogged: {
    labelY: 0.55,
    labelFontSize: 0.50,
  },
};

export const DEFAULT_SIZE = 36;

export function SystemMarker({ 
  system, 
  worldType, 
  ownerColor, 
  size = DEFAULT_SIZE, 
  revealed = true, 
  onHover 
}: Props) {
  worldType = worldType.toLowerCase();
  const styleKey = worldType as keyof typeof systemStyles;
  const style = systemStyles[styleKey] ?? systemStyles.default;

  revealed = revealed || worldType === "homeworld";
  const typeLabel = worldType == "throneworld" ? "TW" : worldType.charAt(0).toUpperCase();
  
  // FOGGED VERSION
  if (!revealed) {
    return (
      <svg width={size} height={size}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}>
        <rect
          width={size}
          height={size}
          rx={4}
          fill={style.fog}
          stroke="black"
          strokeWidth={2}
        />
        <text
          x="50%"
          y={size * LAYOUT.fogged.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * LAYOUT.fogged.labelFontSize}
          fill="#a8a887"
        >
          {typeLabel}
        </text>
      </svg>
    );
  }

  const spaceEntries = Object.entries(system.spaceUnits).filter(([, count]) => count && count > 0);
  const groundEntries = Object.entries(system.groundUnits).filter(([, count]) => count && count > 0);

  return (
    <svg 
      width={size} 
      height={size}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      {/* Background */}
      <rect
        width={size}
        height={size}
        rx={4}
        fill={ownerColor ?? style.background}
        stroke={style.border}
        strokeWidth={2}
      />

      {/* Owner badge (top-left corner) */}
      {ownerColor && (
        <circle
          cx={size * LAYOUT.ownerBadge.cx}
          cy={size * LAYOUT.ownerBadge.cy}
          r={size * LAYOUT.ownerBadge.radius}
          fill={ownerColor}
          stroke="black"
          strokeWidth={LAYOUT.ownerBadge.strokeWidth}
        />
      )}

      {/* Development value (large number) */}
      <text
        x="50%"
        y={size * LAYOUT.devValue.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * LAYOUT.devValue.fontSize}
        fontWeight="bold"
        fill={style.text}
      >
        {system.dev}
      </text>

      {/* Space units column (left side, bottom-aligned) */}
      {spaceEntries.length > 0 && (
        <g>
          {/* Calculate starting y position (bottom-aligned, stack upward) */}
          {spaceEntries.map(([unitId, count], i) => {
            const glyph = UNITS[unitId]?.Symbol ?? "?";
            const lineIndex = spaceEntries.length - 1 - i; // reverse index (bottom to top)
            const y = size * (1 - LAYOUT.spaceColumn.bottomPadding) - lineIndex * size * LAYOUT.spaceColumn.lineHeight;
            
            return (
              <g key={unitId}>
                {/* Count & glyph */}
                <text 
                  x={size * LAYOUT.spaceColumn.x} 
                  y={y} 
                  fontSize={size * LAYOUT.spaceColumn.glyphFontSize} 
                  fill={style.text}
                  dominantBaseline="middle"
                >
                  {count}{glyph}
                </text>
              </g>
            );
          })}
          
          {/* Tech level at top of column */}
          {system.spaceTech > 0 && worldType !== "homeworld" && (
            <text
              x={size * LAYOUT.spaceColumn.x}
              y={size * (1 - LAYOUT.spaceColumn.bottomPadding) - spaceEntries.length * size * LAYOUT.spaceColumn.lineHeight}
              fontSize={size * LAYOUT.spaceColumn.techFontSize}
              fontWeight="bold"
              fill={style.text}
              dominantBaseline="middle"
            >
              S{system.spaceTech}
            </text>
          )}
        </g>
      )}

      {/* Ground units column (right side, bottom-aligned) */}
      {groundEntries.length > 0 && (
        <g>
          {/* Calculate starting y position (bottom-aligned, stack upward) */}
          {groundEntries.map(([unitId, count], i) => {
            const glyph = UNITS[unitId]?.Symbol ?? "?";
            const lineIndex = groundEntries.length - 1 - i; // reverse index (bottom to top)
            const y = size * (1 - LAYOUT.groundColumn.bottomPadding) - lineIndex * size * LAYOUT.groundColumn.lineHeight;
            
            return (
              <g key={unitId}>
                {/* Count and glyph */}
                <text 
                  x={size * LAYOUT.groundColumn.x} 
                  y={y} 
                  fontSize={size * LAYOUT.groundColumn.glyphFontSize} 
                  fill={style.text}
                  dominantBaseline="middle"
                  textAnchor="end"
                >
                  {count}{glyph}
                </text>
              </g>
            );
          })}
          
          {/* Tech level at top of column */}
          {system.groundTech > 0 && worldType !== "homeworld" && (
            <text
              x={size * LAYOUT.groundColumn.x}
              y={size * (1 - LAYOUT.groundColumn.bottomPadding) - groundEntries.length * size * LAYOUT.groundColumn.lineHeight}
              fontSize={size * LAYOUT.groundColumn.techFontSize}
              fontWeight="bold"
              fill={style.text}
              dominantBaseline="middle"
              textAnchor="end"
            >
              G{system.groundTech}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}