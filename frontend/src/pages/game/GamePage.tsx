// /frontend/src/pages/game/GamePage.tsx
import { useCallback, useState } from "react";
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
import { SelectionProvider } from "../../../../shared-frontend/contexts/SelectionContext";
import type { ParamChoicesResponse } from "../../../../shared/models/ActionParams";
import { authFetch } from "../../auth/authFetch";
import { useAuth } from "../../auth/useAuth";

export default function GamePage({ gameState }: { gameState: GameState }) {
  const [inspected, setInspected] = useState<InspectContext<unknown> | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);

  const { legalActions } = useLegalActions(gameState.gameId, gameState.version);
  const { executeAction } = useActionExecutor(gameState.gameId, gameState.version, () => { });

  const user = useAuth();

  const frontendModule = getFrontendModule(gameState.gameType);
  if (!frontendModule) {
    return <div>Unknown game type: {gameState.gameType}</div>;
  }

  const boardGeometry = frontendModule.getBoardGeometry?.(gameState);
  const InfoPanelComponent = frontendModule.InfoPanelComponent;

  const actionDefinitions = (legalActions?.actions) ?? [];

  const fetchParamChoices = useCallback(async (
    actionType: string,
    paramName: string,
    filledParams: Record<string, string>
  ): Promise<ParamChoicesResponse> => {
    if (!user) {
      return { choices: [], error: "Not authenticated" };
    }

    try {
      const response = await authFetch(user, `/api/games/${gameState.gameId}/param-choices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, paramName, filledParams }),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const error = await response.json();
        return { choices: [], error: error.error || "Failed to fetch choices" };
      }
    } catch (err) {
      console.error("Error fetching param choices:", err);
      return { choices: [], error: "Network error" };
    }
  }, [user, gameState.gameId]);

  return (
    <GameStateProvider gameState={gameState}>
      <PlayersProvider players={gameState.players}>
        <GameSpecificStateProvider state={gameState.state}>
          <SelectionProvider
            legalActions={actionDefinitions}
            fetchParamChoices={fetchParamChoices}
            onExecuteAction={executeAction}
          >
            <div className="game-root">
              {/* Main board area */}
              <div className="board-container">
                <BoardCanvas
                  gameState={gameState}
                  boardGeometry={boardGeometry}
                  onInspect={setInspected}
                  legalActions={legalActions?.actions}
                  onExecuteAction={executeAction}
                />
              </div>

              {/* Right sidebar */}
              <div className="right-panel">
                {/* Player area */}
                <PlayerArea gameState={gameState} module={frontendModule} />

                {/* Game info */}
                <GameInfoArea gameState={gameState} module={frontendModule} />

                {/* Action panel */}
                <ActionPanel
                  gameId={gameState.gameId}
                  gameVersion={gameState.version}
                  onActionTaken={() => { }}
                />

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
                <ActionHistory gameId={gameState.gameId} />
              </div>

              {/* Message panel overlay */}
              <div className="message-panel-overlay">
                <MessagePanel module={frontendModule} />              
              </div>
            </div>
          </SelectionProvider>
        </GameSpecificStateProvider>
      </PlayersProvider>
    </GameStateProvider>
  );
}