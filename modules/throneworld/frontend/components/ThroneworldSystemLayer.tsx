// /modules/throneworld/frontend/components/ThroneworldSystemLayer.tsx
import { useState } from "react";
import type { ThroneworldBoardView, RenderableSystem } from "../models/ThroneworldBoardView";
import type InspectContext from "../../../../shared/models/InspectContext";
import type HoveredSystemInfo from "../models/HoveredSystemInfo";

import { SystemMarker } from "./SystemMarker";
import PlanetArc from "./PlanetArc";
import HexUnitsLayer from "./HexUnitsLayer";

interface Props {
  boardView: ThroneworldBoardView;
  onInspect?: (ctx: InspectContext<HoveredSystemInfo> | null) => void;
}

interface HoverPreview {
  system: RenderableSystem;
}

/**
 * Renders all system markers + planet arcs for Throneworld.
 * Hover logic lives here because it affects board-layer visuals.
 */
export default function ThroneworldSystemLayer({
  boardView,
  onInspect,
}: Props) {
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);

  return (
    <>
      {boardView.systems.map((sys) => {
        const {
          hexId,
          worldType,
          position,
          marker,
          hover,
        } = sys;

        const { x, y, hexRadius } = position;

        // Marker positioning relative to hex center
        const markerX =
          x - hexRadius * 0.55 + hexRadius * -0.3;
        const markerY =
          y - hexRadius * (Math.sqrt(3) / 2) +
          hexRadius * 0.5 +
          hexRadius * 0.1;

        return (
          <g key={hexId}>
            {/* Planet arc (only when allowed) */}
            {marker.revealed && (
              <PlanetArc
                cx={x}
                cy={y}
                r={hexRadius}
                dev={marker.system.dev}
                worldType={worldType}
                ownerColor={marker.ownerColor}
              />
            )}

            {/* Units */}
            <HexUnitsLayer hexCenter={{x, y}} hexRadius={hexRadius} 
                           system={sys} playerColors={sys.playerColors}/>

            {/* System marker */}
            <g transform={`translate(${markerX}, ${markerY})`}>
              <SystemMarker
                system={
                  marker.revealed
                    ? marker.system
                    : marker.system
                }
                worldType={worldType}
                revealed={marker.revealed}
                ownerColor={marker.ownerColor}
                scannerColors={marker.scannerColors}
                hideUnits={marker.hideUnits}
                onHover={(hovering) => {
                  if (hovering) {
                    setHoverPreview({ system: sys });
                    onInspect?.({
                      kind: "system",
                      id: hexId,
                      data: {
                        hexId,
                        worldType,
                        details: hover.system,
                        revealed: hover.revealed,
                      },
                    });
                  } else {
                    setHoverPreview(null);
                    onInspect?.(null);
                  }
                }}
              />
            </g>
          </g>
        );
      })}

      {/* Hover preview overlay — always on top */}
      {hoverPreview && (
        <g
          pointerEvents="none"
          transform={`translate(${hoverPreview.system.position.x - 70},
                               ${hoverPreview.system.position.y - 70})`}
        >
          <SystemMarker
            system={hoverPreview.system.hover.system}
            worldType={hoverPreview.system.worldType}
            revealed={hoverPreview.system.hover.revealed}
            size={80}
            ownerColor={hoverPreview.system.marker.ownerColor}
            hideUnits={hoverPreview.system.marker.hideUnits}
          />
        </g>
      )}
    </>
  );
}
