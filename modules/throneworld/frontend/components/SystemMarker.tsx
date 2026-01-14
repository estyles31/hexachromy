import type { ThroneworldSystemDetails } from "../../shared/models/Systems.Throneworld";
import { UNITS } from "../../shared/models/Units.Throneworld";
import type { WorldType } from "../../shared/models/BoardLayout.Throneworld";
import "./SystemMarker.css";
import { Glyph } from "../../../../shared-frontend/glyphs/Glyph";

interface Props {
  system: ThroneworldSystemDetails;
  worldType: WorldType;
  ownerColor?: string;
  size?: number;
  revealed?: boolean;
  scannerColors?: string[];
  showScanners?: boolean;
  onHover?: (isHovering: boolean) => void;
  hideUnits?: boolean;
}

export const DEFAULT_SIZE = 36;

/**
 * All layout values are normalized (0–1) relative to marker size
 */
const LAYOUT = {
  devValue: {
    y: 0.3,
    fontSize: 0.5,
  },

  homeworldLabel: {
    y: 0.7,
    fontSize: 0.32,
  },

  spaceColumn: {
    x: 0.01,
    bottomPadding: 0.1,
    lineHeight: 0.18,
    fontSize: 0.18,
  },

  groundColumn: {
    x: 0.99,
    bottomPadding: 0.1,
    lineHeight: 0.18,
    fontSize: 0.18,
  },

  fogged: {
    labelY: 0.55,
    labelFontSize: 0.5,
  },

  scanner: {
    positions: [
      { x: 0.1, y: 0.25 },
      { x: 0.1, y: 0.6 },
      { x: 0.9, y: 0.25 },
      { x: 0.9, y: 0.6 },
      { x: 0.3, y: 0.9 },
      { x: 0.7, y: 0.9 },
    ],
    radius: 0.14, // ← bigger, actually reads
    strokeWidth: 1,
  },

  scannerCenter: {
    y: 0.52,
    fontSize: 0.34,
    opacity: 0.35,
    glyph: "⊙",
  },
};

export function SystemMarker({
  system,
  worldType,
  ownerColor,
  size = DEFAULT_SIZE,
  revealed = true,
  scannerColors = [],
  showScanners = true,
  onHover,
  hideUnits = false,
}: Props) {
  const isHomeworld = worldType === "Homeworld";
  revealed = revealed || isHomeworld;

  const typeLabel = worldType === "Throneworld" ? "TW" : worldType.charAt(0).toUpperCase();

  const scannerMarkers = showScanners ? scannerColors.slice(0, 6) : [];

  const renderScannerMarkers = () => {
    if (scannerMarkers.length === 0) return null;

    return (
      <g className="system-scanners">
        {scannerMarkers.map((color, i) => {
          const pos = LAYOUT.scanner.positions[i];
          if (!pos) return null;

          const cx = size * pos.x;
          const cy = size * pos.y;
          const r = size * LAYOUT.scanner.radius;

          return (
            <g key={`${color}-${i}`}>
              {/* actual marker */}
              <circle cx={cx} cy={cy} r={r} fill={color} stroke="white" strokeWidth={LAYOUT.scanner.strokeWidth} />

              {/* scan glyph */}
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={r * 0.9}
                opacity={0.45}
                pointerEvents="none"
                fill="black"
              >
                ⊙
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  // ---------- FOGGED ----------
  if (!revealed) {
    return (
      <svg
        width={size}
        height={size}
        className={`system-marker system-${worldType.toLowerCase()} fogged`}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
      >
        <rect width={size} height={size} rx={4} />
        <text
          x="50%"
          y={size * LAYOUT.fogged.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * LAYOUT.fogged.labelFontSize}
          className="system-type-label"
        >
          {typeLabel}
        </text>

        {renderScannerMarkers()}
      </svg>
    );
  }

  const spaceEntries = hideUnits ? [] : Object.entries(system.spaceUnits).filter(([, c]) => c && c > 0);

  const groundEntries = hideUnits ? [] : Object.entries(system.groundUnits).filter(([, c]) => c && c > 0);

  // ---------- REVEALED ----------
  return (
    <svg
      width={size}
      height={size}
      className={`system-marker system-${worldType.toLowerCase()}`}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <rect className={ownerColor ?? "unowned"} width={size} height={size} rx={4} fill={ownerColor || undefined} />

      <text
        x="50%"
        y={size * LAYOUT.devValue.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * LAYOUT.devValue.fontSize}
        fontWeight="bold"
        className="system-dev"
      >
        {system.dev}
      </text>

      {isHomeworld && (
        <text
          x="50%"
          y={size * LAYOUT.homeworldLabel.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * LAYOUT.homeworldLabel.fontSize}
          fontWeight="bold"
        >
          HW
        </text>
      )}

      {renderScannerMarkers()}

      {/* Space units (left) */}
      {spaceEntries.map(([unitId, count], i) => {
        const y = size * (1 - LAYOUT.spaceColumn.bottomPadding) - i * size * LAYOUT.spaceColumn.lineHeight;

        return (
          <text
            key={unitId}
            x={size * LAYOUT.spaceColumn.x}
            y={y}
            fontSize={size * LAYOUT.spaceColumn.fontSize}
            dominantBaseline="middle"
          >
            <tspan>{count}</tspan>
            <Glyph backgroundColor="#e8e8e8" mode="font" glyph={UNITS[unitId]?.Glyph} />
          </text>
        );
      })}

      {/* Ground units (right) */}
      {groundEntries.map(([unitId, count], i) => {
        const y = size * (1 - LAYOUT.groundColumn.bottomPadding) - i * size * LAYOUT.groundColumn.lineHeight;

        return (
          <text
            key={unitId}
            x={size * LAYOUT.groundColumn.x}
            y={y}
            fontSize={size * LAYOUT.groundColumn.fontSize}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {count}
            <Glyph backgroundColor="#e8e8e8" mode="font" glyph={UNITS[unitId]?.Glyph} />
          </text>
        );
      })}
    </svg>
  );
}
