import SystemMarker from "./SystemMarker";
import type { BoardGeometry } from "../../shared/models/BoardGeometry.ThroneWorld.ts";
import type { ThroneworldGameState, ThroneworldSystemState } from "../../shared/models/GameState.Throneworld.ts";
import type { SystemDefinition, SystemPool } from "../../shared/models/Systems.ThroneWorld.ts";

interface Props {
  gameState: ThroneworldGameState;
  boardGeometry?: BoardGeometry;
  selectedSystem: string | null;
  onSelectSystem: (systemId: string) => void;
}

const SYSTEM_POOLS = systemPools as SystemPool;

const DEFAULT_SYSTEM: SystemDefinition = {
  dev: 0,
  spaceTech: 0,
  groundTech: 0,
  spaceUnits: {},
  groundUnits: {},
};

function getSystemDefinition(systemState: ThroneworldSystemState): SystemDefinition {
  const [poolKey, indexStr] = systemState.systemId.split("-");
  const pool = (SYSTEM_POOLS as Record<string, SystemDefinition[] | undefined>)[poolKey];
  const idx = Number.parseInt(indexStr ?? "", 10);

  if (!pool || Number.isNaN(idx)) return DEFAULT_SYSTEM;
  return pool[idx] ?? DEFAULT_SYSTEM;
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

        const systemDefinition = getSystemDefinition(systemState);

        return (
          <g
            key={hexId}
            transform={`translate(${x}, ${y})`}
            onClick={() => onSelectSystem(hexId)}
            style={{ cursor: "pointer" }}
          >
            <SystemMarker
              system={systemDefinition}
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
