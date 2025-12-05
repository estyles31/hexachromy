import SystemMarker from "./SystemMarker";
import type { BoardGeometry } from "../../shared/models/BoardGeometry.ThroneWorld.ts";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld.ts";

interface Props {
  gameState: ThroneworldGameState;
  boardGeometry?: BoardGeometry;
  selectedSystem: string | null;
  onSelectSystem: (systemId: string) => void;
}
export function ThroneworldSystemLayer({ gameState, boardGeometry, selectedSystem, onSelectSystem }: Props) {
  if (!boardGeometry) return null;

  return (
    <>
      {Object.entries(gameState.systems).map(([hexId, systemState]) => {
        const hexGeometry = boardGeometry.hexes[hexId];
        if (!hexGeometry) return null;

        const markerSize = 72;
        const x = hexGeometry.x - markerSize / 2;
        const y = hexGeometry.y - markerSize / 2;

        return (
          <g
            key={hexId}
            transform={`translate(${x}, ${y})`}
            onClick={() => onSelectSystem(hexId)}
            style={{ cursor: "pointer" }}
          >
            <SystemMarker
              system={systemState}
              worldType={hexGeometry.worldType.toLowerCase()}
              revealed={systemState.revealed}
            />
            {selectedSystem === hexId ? (
              <rect
                x={-4}
                y={-4}
                width={markerSize + 8}
                height={markerSize + 8}
                fill="none"
                stroke="gold"
                strokeWidth={3}
                rx={10}
              />
            ) : null}
          </g>
        );
      })}
    </>
  );
}
