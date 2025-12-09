import "./BoardCanvas.css";
import type { FrontendModuleDefinition } from "../../../../modules/FrontendModuleDefinition";
import type InspectContext from "../../../../shared/models/InspectContext";
import type { GameState } from "../../../../shared/models/GameState";

interface Props<S,I> {
  gameState: GameState<S>;
  module: FrontendModuleDefinition<S,I>;
  onInspect?: (context: InspectContext<I> | null) => void;
}

export default function BoardCanvas<S,I>({
  gameState,
  module,
  onInspect,
}: Props<S,I>) {
  const { width, height, geometry } =
    module.getBoardGeometry(gameState);

  return (
    <div className="board-container">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseLeave={() => onInspect?.(null)}
      >
        {module.renderBoard({
          gameState,
          boardGeometry: geometry,
          onInspect,
        })}
      </svg>
    </div>
  );
}
