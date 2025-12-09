import type { FrontendModuleDefinition } from "../../../../modules/FrontendModuleDefinition";
import type { GameState } from "../../../../shared/models/GameState";
import "./GameInfoArea.css"

interface GameInfoAreaProps {
  gameState: GameState<any>;
  module: FrontendModuleDefinition<any>;
}

export default function GameInfoArea({
  gameState,
  module
}: GameInfoAreaProps) {
  // If the module provides no inspect UI at all, hide entirely
  if (!module.renderGameInfoArea) {
    return null;
  }

  // Ask the module what (if anything) it wants to show
  const content = module.renderGameInfoArea({ gameState });

  // If the module returns nothing, hide the panel entirely
  if (!content) {
    return null;
  }

  return (
    <div className="game-info">
      {/* Game-specific content */}
      <div className="game-info__content">
        {content}
      </div>
    </div>
  );
}
