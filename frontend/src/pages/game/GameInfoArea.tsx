import type { FrontendModuleDefinition } from "../../../../modules/FrontendModuleDefinition";
import type { GameState } from "../../../../shared/models/GameState";
import "./GameInfoArea.css"

interface GameInfoAreaProps {
  gameState: GameState<any>;
  module: FrontendModuleDefinition<any>;
}

export default function GameInfoArea({ module }: GameInfoAreaProps) {
  // If the module provides no inspect UI at all, hide entirely
   return module.GameInfoAreaComponent && (
    <div className="game-info">
      {/* Game-specific content */}
      <div className="game-info__content">
        <module.GameInfoAreaComponent />
      </div>
    </div>
  );
}
