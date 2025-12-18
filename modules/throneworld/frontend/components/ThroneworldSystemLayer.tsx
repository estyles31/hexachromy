// /modules/throneworld/frontend/components/ThroneworldSystemLayer.tsx
import { useState } from "react";
import type { ThroneworldBoardView, RenderableSystem } from "../models/ThroneworldBoardView";
import type InspectContext from "../../../../shared/models/InspectContext";
import type HoveredSystemInfo from "../models/HoveredSystemInfo";
import { SystemMarker } from "./SystemMarker";
import PlanetArc from "./PlanetArc";
import HexUnitsLayer from "./HexUnitsLayer";
import { DEFAULT_SIZE as sysMarkerSize } from "./SystemMarker";

interface Props {
  boardView: ThroneworldBoardView;
  onInspect?: (ctx: InspectContext<HoveredSystemInfo> | null) => void;
  onFleetClick: (fleetId: string, hexId: string) => void;
  onUnitClick: (unitId: string, hexId: string) => void;
  selectableGamePieces: Set<string>;
  selectedFleetId: string | null;
  selectedUnitId: string | null;
}

interface HoverPreview {
  system: RenderableSystem;
}

export default function ThroneworldSystemLayer({
  boardView,
  onInspect,
  onFleetClick,
  onUnitClick,
  selectableGamePieces,
  selectedFleetId,
  selectedUnitId,
}: Props) {
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);

  return (
    <>
      {boardView.systems.map((sys) => {
        const { hexId, worldType, position, marker, hover } = sys;
        const { x, y, hexRadius } = position;

        const markerX = x - hexRadius + 0.33 * sysMarkerSize;
        const markerY = y - 0.5 * sysMarkerSize;

        return (
          <g key={hexId}>
            {/* Planet arc (only when revealed) */}
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

            {/* Units layer */}
            <HexUnitsLayer
              hexId={hexId}
              hexCenter={{ x, y }}
              hexRadius={hexRadius}
              system={sys}
              playerColors={sys.playerColors}
              onFleetClick={onFleetClick}
              onUnitClick={onUnitClick}
              selectableGamePieces={selectableGamePieces}
              selectedFleetId={selectedFleetId}
              selectedUnitId={selectedUnitId}
            />

            {/* System marker */}
            <g transform={`translate(${markerX}, ${markerY})`}>
              <SystemMarker
                system={marker.system}
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

      {/* Hover preview overlay */}
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