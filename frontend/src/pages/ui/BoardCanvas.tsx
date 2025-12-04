import "./BoardCanvas.css";
import StaticBoardLayer from "./StaticBoardLayer";
import SpaceLayer from "./SpaceLayer";
import ObjectLayer from "./ObjectLayer";
import OverlayLayer from "./OverlayLayer";

export default function BoardCanvas({
  gameState,
  selectedSystem,
  selectedObject,
  onSelectSystem,
  onSelectObject
}: any) {
  return (
    <div className="board-container">
      <svg width="800" height="800" viewBox="0 0 800 800">

        <StaticBoardLayer />

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
