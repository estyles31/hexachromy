import "./BoardCanvas.css";
import type { FrontendModuleDefinition, HoveredSystemInfo } from "../../modules/types";
import SpaceLayer from "./SpaceLayer";
import ObjectLayer from "./ObjectLayer";

export default function BoardCanvas({
  gameState,
  module,
  onHoverSystem,
}: {
  gameState: any;
  module?: FrontendModuleDefinition;
  onHoverSystem?: (info: HoveredSystemInfo | null) => void;
}) {
  const StaticBoardLayer = module?.StaticBoardLayer;
  const ModuleSpaceLayer = module?.SpaceLayer;

  const { boardGeometry, width: moduleWidth, height: moduleHeight } =
    module?.getBoardGeometry?.(gameState) ?? {};

  const boardWidth = moduleWidth ?? 800;
  const boardHeight = moduleHeight ?? 800;

  const objects = Array.isArray(gameState.objects) ? gameState.objects : [];

  const SpaceLayerComponent = ModuleSpaceLayer ?? SpaceLayer;

  return (
    <div className="board-container">
      <svg
        width={boardWidth}
        height={boardHeight}
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
        onMouseLeave={() => onHoverSystem?.(null)}
      >

        {StaticBoardLayer ? <StaticBoardLayer gameState={gameState} boardGeometry={boardGeometry} /> : null}

        <SpaceLayerComponent
          gameState={gameState}
          boardGeometry={boardGeometry}
          onHoverSystem={onHoverSystem}
        />

        <ObjectLayer objects={objects} />

      </svg>
    </div>
  );
}
