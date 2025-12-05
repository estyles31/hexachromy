import type { BoardGeometry } from "../../../../modules/throneworld/shared/models/BoardGeometry.ThroneWorld.ts";
import type { ThroneworldGameState } from "../../../../modules/throneworld/shared/models/GameState.Throneworld.ts";
import { ThroneworldSystemLayer } from "../../../../modules/throneworld/frontend/components/ThroneworldSystemLayer.tsx";

export default function SpaceLayer({
  gameState,
  boardGeometry,
  selectedSystem,
  onSelectSystem
}: {
  gameState: any;
  boardGeometry?: BoardGeometry;
  selectedSystem: string | null;
  onSelectSystem: (system: string) => void;
}) {
  if (gameState?.gameType === "throneworld" && boardGeometry) {
    return (
      <ThroneworldSystemLayer
        gameState={gameState as ThroneworldGameState}
        boardGeometry={boardGeometry}
        selectedSystem={selectedSystem}
        onSelectSystem={onSelectSystem}
      />
    );
  }

  const systems = Array.isArray(gameState?.systems) ? gameState.systems : [];

  return (
    <>
      {systems.map((s: any) => (
        <circle
          key={s.id}
          cx={s.x}
          cy={s.y}
          r={18}
          fill={s.ownerColor}
          className={"system-circle" + (selectedSystem === s.id ? " selected" : "")}
          onClick={() => onSelectSystem(s.id)}
        />
      ))}
    </>
  );
}

