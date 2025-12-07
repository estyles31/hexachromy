//PlanetArc.tsx
import { planetStyles, type PlanetStyleKey } from "../config/planetStyles";

interface Props {
  dev: number;
  worldType: string;       // "outer" | "inner" | "fringe" | "throneworld" | "homeworld"
  cx: number;
  cy: number;
  r: number;               // hex radius (from center to a vertex)
  ownerColor?: string;     // tint overlay
}

export default function PlanetArc({ dev, worldType, cx, cy, r, ownerColor }: Props) {
  worldType = worldType.toLowerCase();

  // Determine style source
  const styleKey = ((worldType === "homeworld" || worldType === "throneworld") 
                    ? worldType
                    : `dev${dev}`) as PlanetStyleKey;

  const style = planetStyles[styleKey];

  // Gradient ID must be unique per hex so use cx/cy combo
  const gradientId = `planet-grad-${cx}-${cy}`;

  // Geometry for arc (bottom-left vertex → midpoint right)
  const x1 = cx - r * 0.5;
  const y1 = cy + (Math.sqrt(3) / 2) * r;

  const x2 = cx + r;      // midpoint of right edge
  const y2 = cy;

  const bottomRightX = cx + r * 0.5;
  const bottomRightY = cy + (Math.sqrt(3) / 2) * r;

  // Control point pulls arc upward (deeper fill to occupy ~35-40% of the hex height)
  const cpx = cx;
  const cpy = cy + r * 0.65;

  const pathData = `
    M ${x1} ${y1}
    Q ${cpx} ${cpy} ${x2} ${y2}
    L ${bottomRightX} ${bottomRightY}
    Z
  `;

  return (
    <g>
      {/* Planet Gradient */}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={style.gradient[0]} />
          <stop offset="100%" stopColor={style.gradient[1]} />
        </linearGradient>
      </defs>

      {/* Planet Arc */}
      <path d={pathData} fill={`url(#${gradientId})`} />

      {/* Highlight Arc */}
      {style.highlight && (
        <path
          d={pathData}
          fill="none"
          stroke={style.highlight}
          strokeWidth={2}
          opacity={0.7}
        />
      )}

      {/* Ownership Tint (very subtle) */}
      {ownerColor && (
        <path
          d={pathData}
          fill={ownerColor}
          opacity={0.12}
        />
      )}
    </g>
  );
}
