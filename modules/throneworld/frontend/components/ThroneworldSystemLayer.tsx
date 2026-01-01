// /modules/throneworld/frontend/components/ThroneworldSystemLayer.tsx
import type { ThroneworldBoardView } from "../models/ThroneworldBoardView";
import type InspectContext from "../../../../shared/models/InspectContext";
import type { HoveredInfo } from "../models/HoveredInfo";
import { SystemMarker } from "./SystemMarker";
import PlanetArc from "./PlanetArc";
import { DEFAULT_SIZE as sysMarkerSize } from "./SystemMarker";

interface Props {
  boardView: ThroneworldBoardView;
  onInspect?: (ctx: InspectContext<HoveredInfo> | null) => void;
}

export default function ThroneworldSystemLayer({
  boardView,
  onInspect
}: Props) {

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

            {/* Units layer - moved to its own sibling layer */}
            {/* <HexUnitsLayer
              hexId={hexId}
              hexCenter={{ x, y }}
              hexRadius={hexRadius}
              system={sys}
              playerColors={sys.playerColors}
            /> */}

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
                    onInspect?.({
                      kind: "system",
                      id: hexId,
                      data: {
                        kind: "system",
                        hexId,
                        worldType,
                        details: hover.system,
                        revealed: hover.revealed,
                      },
                    });
                  } else {
                    onInspect?.(null);
                  }
                }}
              />
            </g>
          </g>
        );
      })}
    </>
  );
}