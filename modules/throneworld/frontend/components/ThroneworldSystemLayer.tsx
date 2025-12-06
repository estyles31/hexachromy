import { SystemMarker, DEFAULT_SIZE } from "./SystemMarker";
import { HEX_RADIUS, type BoardGeometry } from "../../shared/models/BoardGeometry.ThroneWorld";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { useState } from "react";

interface Props {
  gameState: ThroneworldGameState;
  boardGeometry?: BoardGeometry;
  selectedSystem: string | null;
  onSelectSystem: (systemId: string) => void;
}

interface HoverPreview {
  hexId: string;
  systemState: ThroneworldGameState["systems"][string];
  worldType: string;
  x: number;
  y: number;
}

export function ThroneworldSystemLayer({
  gameState,
  boardGeometry,
  selectedSystem,
  onSelectSystem,
}: Props) {
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);

  if (!boardGeometry) return null;

  return (
    <>
      {/* NORMAL SYSTEM MARKERS */}
      {Object.entries(gameState.systems).map(([hexId, systemState]) => {
        const hexGeometry = boardGeometry.hexes[hexId];
        if (!hexGeometry) return null;

        const markerSize = DEFAULT_SIZE;
        const hexRadius = HEX_RADIUS;

        const xpadding = hexRadius * -0.20;
        const ypadding = hexRadius * 0.50;

        const x =
          hexGeometry.x -
          hexRadius * 0.55 +
          xpadding;

        const y =
          hexGeometry.y -
          hexRadius * (Math.sqrt(3) / 2) +
          ypadding +
          hexRadius * 0.08;

        return (
          <g key={hexId}>
            <g
              transform={`translate(${x}, ${y})`}
              onClick={() => onSelectSystem(hexId)}
              style={{ cursor: "pointer" }}
            >
              <SystemMarker
                system={systemState}
                worldType={hexGeometry.worldType.toLowerCase()}
                revealed={systemState.revealed}
                size={markerSize}
                onHover={(hovering) =>
                  setHoverPreview(
                    hovering
                      ? {
                          hexId,
                          systemState,
                          worldType: hexGeometry.worldType.toLowerCase(),
                          x: hexGeometry.x,
                          y: hexGeometry.y,
                        }
                      : null
                  )
                }
              />

              {/* Selection outline */}
              {selectedSystem === hexId && (
                <rect
                  x={-3}
                  y={-3}
                  width={markerSize + 6}
                  height={markerSize + 6}
                  fill="none"
                  stroke="gold"
                  strokeWidth={2.5}
                  rx={6}
                  pointerEvents="none"
                />
              )}
            </g>
          </g>
        );
      })}

      {/* HOVER PREVIEW OVERLAY — ALWAYS ON TOP */}
      {hoverPreview && (
        <g
          id="system-hover-overlay"
          pointerEvents="none"
          transform={`translate(${hoverPreview.x - 70}, ${hoverPreview.y - 70})`}
        >
          <SystemMarker
            system={hoverPreview.systemState}
            worldType={hoverPreview.worldType}
            revealed={true /*hoverPreview.systemState.revealed*/}
            size={125}
          />
        </g>
      )}
    </>
  );
}
