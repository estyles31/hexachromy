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

  return (
    <div className="board-container">
      <svg width="800" height="800" viewBox="0 0 800 800">

        {StaticBoardLayer ? <StaticBoardLayer /> : null}

        <SpaceLayer
          systems={gameState.systems}
          selectedSystem={selectedSystem}
          onSelectSystem={onSelectSystem}
        />

        <ObjectLayer
          objects={gameState.objects}
          selectedObject={selectedObject}
          onSelectObject={onSelectObject}
        />

        <OverlayLayer
          selectedSystem={selectedSystem}
          selectedObject={selectedObject}
          systems={gameState.systems}
          objects={gameState.objects}
        />

      </svg>
    </div>
  );
}
