import { useState } from "react";
import type { GameState } from "../../../../shared/models/GameState";
import type { FrontendModuleDefinition } from "../../../../modules/FrontendModuleDefinition";
import BoardCanvas from "./BoardCanvas";
import { getFrontendModule } from "../../modules/getFrontendModule";
import type InspectContext from "../../../../shared/models/InspectContext";
import PlayerArea from "./PlayerArea";
import GameInfoArea from "./GameInfoArea";

export default function GamePage({ gameState }: { gameState: GameState }) {
  const [inspected, setInspected] = useState<InspectContext<unknown> | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const module = getFrontendModule(gameState.gameType) as FrontendModuleDefinition<unknown, unknown>;

  if (!module) {
    return <div>Unsupported game type: {gameState.gameType}</div>;
  }

  return (
    <div className="game-root">
      <BoardCanvas
        gameState={gameState}
        module={module}
        onInspect={setInspected}
      />

      <div className="right-panel">
        <GameInfoArea module={module} gameState={gameState} />
        <PlayerArea module={module} gameState={gameState} />
        
        {module.renderInfoPanel && (
          <label>
            <input
              type="checkbox"
              checked={showInfoPanel}
              onChange={e => setShowInfoPanel(e.target.checked)}
            />
            Show hover info
          </label>
        )}

      </div>

      {showInfoPanel && module.renderInfoPanel && (
        <div className="info-panel">
          {module.renderInfoPanel({
            gameState,
            inspected,
          })}
        </div>
      )}

    </div>
  );
}
