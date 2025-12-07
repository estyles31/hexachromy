import { SystemMarker, DEFAULT_SIZE } from "./SystemMarker";
import PlanetArc from "./PlanetArc";
import { HEX_RADIUS, type BoardGeometry } from "../../shared/models/BoardGeometry.ThroneWorld";
import type {
  ThroneworldGameView,
  ThroneworldSystemDetails,
} from "../../shared/models/GameState.Throneworld";
import { useMemo, useState } from "react";
import type { HoveredSystemInfo } from "../../../../frontend/src/modules/types";

interface Props {
  gameState: ThroneworldGameView;
  boardGeometry?: BoardGeometry;
  onHoverSystem?: (hover: HoveredSystemInfo | null) => void;
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
  onHoverSystem,
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
        const isPlayerOwned = Boolean(resolvedDetails.owner && resolvedDetails.owner !== "neutral");
        const ownerColor = isPlayerOwned
          ? playerColorMap[resolvedDetails.owner as string] ?? "#666"
          : undefined;
        const isRevealed = publicSystem.revealed;
        const hoverDetails = privateDetails ?? publicDetails ?? EMPTY_DETAILS;
        const hoverRevealed = publicSystem.revealed || Boolean(privateDetails);
        const worldType = hexGeometry.worldType.toLowerCase();
        const shouldShowPlanetArc = publicSystem.revealed || worldType === "homeworld";

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
            {shouldShowPlanetArc && (
              <PlanetArc
                dev={resolvedDetails.dev}
                worldType={worldType}
                cx={hexGeometry.x}
                cy={hexGeometry.y}
                r={hexRadius}
                ownerColor={ownerColor}
              />
            )}
            <g
              transform={`translate(${x}, ${y})`}
            >
              <SystemMarker
                system={resolvedDetails}
                worldType={worldType}
                revealed={isRevealed}
                ownerColor={ownerColor}
                hideUnits={isPlayerOwned}
                size={markerSize}
                scannerColors={scannerColors}
                onHover={(hovering) => {
                  const nextHover = hovering
                    ? {
                        hexId,
                        systemState: hoverDetails,
                        worldType,
                        x: hexGeometry.x,
                        y: hexGeometry.y,
                        revealed: hoverRevealed,
                      }
                    : null;
                  setHoverPreview(nextHover);
                  onHoverSystem?.(
                    hovering
                      ? {
                          hexId,
                          worldType,
                          details: hoverDetails,
                          revealed: hoverRevealed,
                        }
                      : null,
                  );
                }}
              />
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
            ownerColor={
              hoverPreview.systemState.owner && hoverPreview.systemState.owner !== "neutral"
                ? playerColorMap[hoverPreview.systemState.owner]
                : undefined
            }
            hideUnits={Boolean(
              hoverPreview.systemState.owner && hoverPreview.systemState.owner !== "neutral",
            )}
          />
        </g>
      )}
    </>
  );
}
