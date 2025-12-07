import { SystemMarker, DEFAULT_SIZE } from "./SystemMarker";
import { HEX_RADIUS, type BoardGeometry } from "../../shared/models/BoardGeometry.ThroneWorld";
import type {
  ThroneworldGameView,
  ThroneworldSystemDetails,
} from "../../shared/models/GameState.Throneworld";
import { useMemo, useState } from "react";

interface Props {
  gameState: ThroneworldGameView;
  boardGeometry?: BoardGeometry;
  selectedSystem: string | null;
  onSelectSystem: (systemId: string) => void;
}

interface HoverPreview {
  hexId: string;
  systemState: ThroneworldSystemDetails;
  worldType: string;
  x: number;
  y: number;
  revealed: boolean;
}

const PLAYER_COLORS = ["#ff7043", "#4dd0e1", "#ce93d8", "#aed581", "#ffd54f", "#90caf9"];

const EMPTY_DETAILS: ThroneworldSystemDetails = {
  systemId: "unknown",
  owner: null,
  dev: 0,
  spaceTech: 0,
  groundTech: 0,
  spaceUnits: {},
  groundUnits: {},
};

export function ThroneworldSystemLayer({
  gameState,
  boardGeometry,
  selectedSystem,
  onSelectSystem,
}: Props) {
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);

  const playerColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    gameState.playerIds.forEach((playerId, index) => {
      map[playerId] = PLAYER_COLORS[index % PLAYER_COLORS.length];
    });
    return map;
  }, [gameState.playerIds]);

  if (!boardGeometry) return null;

  return (
    <>
      {/* NORMAL SYSTEM MARKERS */}
      {Object.entries(gameState.systems).map(([hexId, publicSystem]) => {  
        const hexGeometry = boardGeometry.hexes[hexId];
        if (!hexGeometry) return null;

        const publicDetails = publicSystem.details;
        const privateDetails = gameState.playerView?.systems?.[hexId];
        const resolvedDetails = publicDetails ?? privateDetails ?? EMPTY_DETAILS;
        const isRevealed = publicSystem.revealed;
        const hoverDetails = privateDetails ?? publicDetails ?? EMPTY_DETAILS;
        const hoverRevealed = publicSystem.revealed || Boolean(privateDetails);

        const scannerColors = (publicSystem.scannedBy ?? []).map(
          playerId => playerColorMap[playerId] ?? "#777",
        );

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
                system={resolvedDetails}
                worldType={hexGeometry.worldType.toLowerCase()}
                revealed={isRevealed}
                size={markerSize}
                scannerColors={scannerColors}
                onHover={(hovering) =>
                  setHoverPreview(
                    hovering
                      ? {
                          hexId,
                          systemState: hoverDetails,
                          worldType: hexGeometry.worldType.toLowerCase(),
                          x: hexGeometry.x,
                          y: hexGeometry.y,
                          revealed: hoverRevealed,
                        }
                      : null,
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
            revealed={hoverPreview.revealed}
            size={125}
          />
        </g>
      )}
    </>
  );
}
