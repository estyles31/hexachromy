import "./BoardCanvas.css";
import type { FrontendModuleDefinition } from "../../modules/types";
import SpaceLayer from "./SpaceLayer";
import ObjectLayer from "./ObjectLayer";
import OverlayLayer from "./OverlayLayer";

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
  const ModuleSpaceLayer = module?.SpaceLayer;

  const { boardGeometry, width: moduleWidth, height: moduleHeight } =
    module?.getBoardGeometry?.(gameState) ?? {};

  const boardWidth = moduleWidth ?? 800;
  const boardHeight = moduleHeight ?? 800;

  const objects = Array.isArray(gameState.objects) ? gameState.objects : [];
  const overlaySystems = Array.isArray(gameState.systems) ? gameState.systems : [];

  const SpaceLayerComponent = ModuleSpaceLayer ?? SpaceLayer;

  return (
    <div className="board-container">
      <svg width={boardWidth} height={boardHeight} viewBox={`0 0 ${boardWidth} ${boardHeight}`}>

        {StaticBoardLayer ? <StaticBoardLayer gameState={gameState} boardGeometry={boardGeometry} /> : null}

        <SpaceLayerComponent
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
