import "./BoardCanvas.css";
import type { FrontendModuleDefinition } from "../../modules/types";
import SpaceLayer from "./SpaceLayer";
import ObjectLayer from "./ObjectLayer";
import OverlayLayer from "./OverlayLayer";
import { computeBoardGeometry, type BoardGeometry } from "../../../../modules/throneworld/shared/models/BoardGeometry.ThroneWorld.ts";
import { parsePlayerCountFromScenario } from "../../../../modules/throneworld/shared/utils/scenario.ts";

export default function BoardCanvas({
  gameState,
  module,
  selectedSystem,
  selectedObject,
  onSelectSystem,
  onSelectObject
}: {
  gameState: any;
  module?: FrontendModuleDefinition;
  selectedSystem: any;
  selectedObject: any;
  onSelectSystem: (system: any) => void;
  onSelectObject: (object: any) => void;
}) {
  const StaticBoardLayer = module?.StaticBoardLayer;

  let boardGeometry: BoardGeometry | undefined;
  let boardWidth = 800;
  let boardHeight = 800;

  if (gameState?.gameType === "throneworld") {
    try {
      const playerCount = parsePlayerCountFromScenario(
        typeof gameState.scenario === "string" ? gameState.scenario : undefined,
        Array.isArray(gameState.playerIds) ? gameState.playerIds.length : 0,
      );
      boardGeometry = computeBoardGeometry(playerCount);
      boardWidth = boardGeometry.width;
      boardHeight = boardGeometry.height;
    } catch (err) {
      console.error(err);
    }
  }

  const objects = Array.isArray(gameState.objects) ? gameState.objects : [];
  const overlaySystems = Array.isArray(gameState.systems) ? gameState.systems : [];

  return (
    <div className="board-container">
      <svg width={boardWidth} height={boardHeight} viewBox={`0 0 ${boardWidth} ${boardHeight}`}>

        {StaticBoardLayer ? <StaticBoardLayer gameState={gameState} boardGeometry={boardGeometry} /> : null}

        <SpaceLayer
          gameState={gameState}
          boardGeometry={boardGeometry}
          selectedSystem={selectedSystem}
          onSelectSystem={onSelectSystem}
        />

        <ObjectLayer
          objects={objects}
          selectedObject={selectedObject}
          onSelectObject={onSelectObject}
        />

        <OverlayLayer
          selectedSystem={selectedSystem}
          selectedObject={selectedObject}
          systems={overlaySystems}
          objects={objects}
        />

      </svg>
    </div>
  );
}
