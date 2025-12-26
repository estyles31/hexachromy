// /frontend/src/pages/game/GamePage.tsx
import { useState } from "react";
import type { GameState } from "../../../../shared/models/GameState";
import BoardCanvas from "./BoardCanvas";
import { getFrontendModule } from "../../modules/getFrontendModule";
import type InspectContext from "../../../../shared/models/InspectContext";
import PlayerArea from "./PlayerArea";
import GameInfoArea from "./GameInfoArea";
import "./GamePage.css";
import ActionHistory from "./ActionHistory";
import ActionPanel from "./ActionPanel";
import MessagePanel from "./MessagePanel";
import { GameStateProvider,  PlayersProvider } from "../../../../shared-frontend/contexts/GameStateContext";
import { SelectionProvider } from "../../components/SelectionProvider";

export default function GamePage({ gameState }: { gameState: GameState<unknown> }) {
  const [inspected, setInspected] = useState<InspectContext<unknown> | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);

  const frontendModule = getFrontendModule(gameState.gameType);
  if (!frontendModule) {
    return <div>Unknown game type: {gameState.gameType}</div>;
  }
  const InfoPanelComponent = frontendModule.InfoPanelComponent;

  return (
    <GameStateProvider gameState={gameState}>
      <PlayersProvider>
          <SelectionProvider>
            <div className="game-root">
              {/* Main board area */}
              <div className="board-container">
                <BoardCanvas
                  module={frontendModule}
                  onInspect={setInspected}
                />
              </div>

              {/* Right sidebar */}
              <div className="right-panel">
                {/* Action panel */}
                <ActionPanel />

                {/* Game info */}
                <GameInfoArea module={frontendModule} />

                {/* Player area */}
                <PlayerArea module={frontendModule} />

                {/* Info panel toggle */}
                <button
                  className="info-panel-toggle"
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                >
                  {showInfoPanel ? "Hide Info" : "Show Info"}
                </button>
              </div>

              {/* Info panel (when something is inspected) */}
              {showInfoPanel && inspected && InfoPanelComponent && (
                <div className="info-panel-container">
                  <InfoPanelComponent inspected={inspected} />
                </div>
              )}
              
              {/* Action history */}
              <div className="action-history-container">
                <ActionHistory />
              </div>

              {/* Message panel overlay */}
              <div className="message-panel-overlay">
                <MessagePanel />              
              </div>
            </div>
          </SelectionProvider>
      </PlayersProvider>
    </GameStateProvider>
  );
}