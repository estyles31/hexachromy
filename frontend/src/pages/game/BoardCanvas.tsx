import "./BoardCanvas.css";
import type { FrontendModuleDefinition } from "../../../../modules/FrontendModuleDefinition";
import type InspectContext from "../../../../shared/models/InspectContext";
import type { GameState } from "../../../../shared/models/GameState";

interface Props<S, I> {
  gameState: GameState<S>;
  module: FrontendModuleDefinition<S, I>;
  onInspect?: (context: InspectContext<I> | null) => void;
}

export default function BoardCanvas<S, I>({
  gameState,
  module,
  onInspect,
}: Props<S, I>) {
  const geometry = module.getBoardGeometry(gameState);


  return (
    <div className="board-container">
      <svg
        width={geometry.width}
        height={geometry.height}
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        onMouseLeave={() => onInspect?.(null)}
      >
        {module.MainBoardComponent
          && <module.MainBoardComponent gameState={gameState} boardGeometry={geometry} onInspect={onInspect} />
        }
      </svg>
    </div>
  );
}
