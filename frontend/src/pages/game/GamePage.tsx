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
import {
  GameStateProvider,
  PlayersProvider,
  GameSpecificStateProvider,
} from "../../../../shared-frontend/contexts/GameStateContext";
import { useLegalActions } from "../../../../shared-frontend/hooks/useLegalActions";
import { useActionExecutor } from "../../hooks/useActionExecutor";

export default function GamePage({ gameState }: { gameState: GameState }) {
  const [inspected, setInspected] = useState<InspectContext<unknown> | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);

  const { legalActions } = useLegalActions(gameState.gameId, gameState.version);
  const { executeAction } = useActionExecutor(gameState.gameId, gameState.version, () => {});

  const frontendModule = getFrontendModule(gameState.gameType);
  if (!frontendModule) {
    return <div>Unknown game type: {gameState.gameType}</div>;
  }

  const boardGeometry = frontendModule.getBoardGeometry?.(gameState);
  const InfoPanelComponent = frontendModule.InfoPanelComponent;

  return (
    <GameStateProvider gameState={gameState}>
      <PlayersProvider players={gameState.players}>
        <GameSpecificStateProvider state={gameState.state}>
          <div className="game-page">
            {/* Main board area */}
            <div className="board-container">
              <BoardCanvas
                gameState={gameState}
                boardGeometry={boardGeometry}
                onInspect={setInspected}
                legalActions={legalActions?.actions}
                onExecuteAction={executeAction}
              />
              
              {/* Message panel overlay */}
              <MessagePanel module={frontendModule} />
            </div>

            {/* Right sidebar */}
            <div className="sidebar">
              {/* Player area */}
              <PlayerArea gameState={gameState} module={frontendModule} />

              {/* Game info */}
              <GameInfoArea gameState={gameState} module={frontendModule} />

              {/* Action panel */}
              <ActionPanel
                gameId={gameState.gameId}
                gameVersion={gameState.version}
                onActionTaken={() => {}}
              />

              {/* Info panel toggle */}
              <button
                className="info-panel-toggle"
                onClick={() => setShowInfoPanel(!showInfoPanel)}
              >
                {showInfoPanel ? "Hide Info" : "Show Info"}
              </button>

              {/* Info panel (when something is inspected) */}
              {showInfoPanel && inspected && InfoPanelComponent && (
                <div className="info-panel">
                  <InfoPanelComponent inspected={inspected} />
                </div>
              )}

              {/* Action history */}
              <ActionHistory gameId={gameState.gameId} />
            </div>
          </div>
        </GameSpecificStateProvider>
      </PlayersProvider>
    </GameStateProvider>
  );
}