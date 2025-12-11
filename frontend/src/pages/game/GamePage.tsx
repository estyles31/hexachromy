// /src/pages/game/GamePage.tsx
import { useState } from "react";
import type { GameState } from "../../../../shared/models/GameState";
import type { FrontendModuleDefinition } from "../../../../modules/FrontendModuleDefinition";
import BoardCanvas from "./BoardCanvas";
import { getFrontendModule } from "../../modules/getFrontendModule";
import type InspectContext from "../../../../shared/models/InspectContext";
import PlayerArea from "./PlayerArea";
import GameInfoArea from "./GameInfoArea";
import "./GamePage.css";
import ActionHistory from "../../components/ActionHistory";
import ActionPanel from "../../components/ActionPanel";
import { 
  GameStateProvider, 
  PlayersProvider, 
  GameSpecificStateProvider 
} from "../../../../shared-frontend/contexts/GameStateContext";

export default function GamePage({ gameState }: { gameState: GameState }) {
  const [inspected, setInspected] = useState<InspectContext<unknown> | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  
  const module = getFrontendModule(gameState.gameType) as FrontendModuleDefinition<unknown, unknown>;

  if (!module) {
    return <div>Unsupported game type: {gameState.gameType}</div>;
  }

  // Build player names map for action history
  const playerNames = Object.fromEntries(
    Object.entries(gameState.players)
      .map(([id, player]) => [id, player.displayName || "Unknown"])
  );

  const handleActionTaken = () => {
    // With Firestore listener, no need to manually refetch
    // The listener will automatically update when state changes
    // But we keep this for any other side effects
    window.dispatchEvent(new Event("gameStateChanged"));
  };

  return (
    <GameStateProvider gameState={gameState}>
      <PlayersProvider players={gameState.players}>
        <GameSpecificStateProvider state={gameState.state}>
          <div className="game-root">
            <div className="board-container">
              <BoardCanvas
                gameState={gameState}
                module={module}
                onInspect={setInspected}
              />
            </div>

            <div className="right-panel">
              <ActionPanel 
                gameId={gameState.gameId}
                gameVersion={gameState.version} 
                onActionTaken={handleActionTaken}
              />
              
              <GameInfoArea module={module} gameState={gameState} />
              <PlayerArea module={module} gameState={gameState} />
              
              {module.InfoPanelComponent && (
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

            {showInfoPanel && module.InfoPanelComponent && (
              <div className="info-panel-container">
                <module.InfoPanelComponent inspected={inspected} />
              </div>
            )}

            {/* Action History in lower left */}
            <div className="action-history-container">
              <ActionHistory 
                gameId={gameState.gameId}
                gameVersion={gameState.version}
                playerNames={playerNames}
              />
            </div>
          </div>
        </GameSpecificStateProvider>
      </PlayersProvider>
    </GameStateProvider>
  );
}