import type { FrontendModuleDefinition } from "../../../../shared-frontend/FrontendModuleDefinition";
import "./GameInfoArea.css"

interface GameInfoAreaProps {
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
