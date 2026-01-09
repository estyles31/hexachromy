// /frontend/src/pages/game/GamePage.tsx
import { useRef, useState } from "react";
import type { GameState } from "../../../../shared/models/GameState";
import BoardCanvas from "./BoardCanvas";
import { getFrontendModule } from "../../modules/getFrontendModule";
import type InspectContext from "../../../../shared-frontend/InspectContext";
import PlayerArea from "./PlayerArea";
import GameInfoArea from "./GameInfoArea";
import "./GamePage.css";
import ActionHistory from "./ActionHistory";
import ActionPanel from "./ActionPanel";
import MessagePanel from "./MessagePanel";
import { GameStateProvider, PlayersProvider } from "../../../../shared-frontend/contexts/GameStateContext";
import { SelectionProvider } from "../../components/SelectionProvider";
import Draggable from "react-draggable";
import { InspectContextReact } from "../../../../shared-frontend/InspectContext";

export default function GamePage({ gameState }: { gameState: GameState<unknown> }) {
  const [inspected, setInspected] = useState<InspectContext<unknown> | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);

  const historyRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const frontendModule = getFrontendModule(gameState.gameType);
  if (!frontendModule) {
    return <div>Unknown game type: {gameState.gameType}</div>;
  }
  const InfoPanelComponent = frontendModule.InfoPanelComponent;

  return (
    <GameStateProvider gameState={gameState}>
      <PlayersProvider>
        <SelectionProvider>
          <InspectContextReact.Provider value={setInspected}>
            <div className="game-root" style={{ gridTemplateColumns: `1fr ${rightPanelWidth}px` }}>
              {/* Action panel */}
              <Draggable
                nodeRef={panelRef}
                handle=".action-panel"
                onStart={() => console.log("drag start")}
                onDrag={() => console.log("dragging")}
                onStop={() => console.log("stop drag")}
              >
                <div ref={panelRef} className="action-panel-overlay">
                  <ActionPanel />
                </div>
              </Draggable>

              {/* Main board area */}
              <div className="board-container">
                <BoardCanvas module={frontendModule} onInspect={setInspected} />

                {/* Message panel overlay */}
                <div className="message-panel-overlay ui-overlay">
                  <MessagePanel />
                </div>

                {/* Info panel (when something is inspected) */}
                {showInfoPanel && inspected && InfoPanelComponent && (
                  <div className="info-panel-container ui-overlay">
                    <InfoPanelComponent inspected={inspected} />
                  </div>
                )}
              </div>

              {/* Right sidebar */}
              <div className="right-panel">
                <div
                  className="right-panel-resizer"
                  onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startWidth = rightPanelWidth;

                    const onMove = (e: MouseEvent) => {
                      setRightPanelWidth(Math.max(220, startWidth - (e.clientX - startX)));
                    };

                    const onUp = () => {
                      window.removeEventListener("mousemove", onMove);
                      window.removeEventListener("mouseup", onUp);
                    };

                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  }}
                />
                {/* Game info */}
                <GameInfoArea module={frontendModule} />

                {/* Player area */}
                <PlayerArea module={frontendModule} />

                {/* Info panel toggle */}
                <label className="info-panel-toggle">
                  <input type="checkbox" onChange={(e) => setShowInfoPanel(e.target.checked)} checked={showInfoPanel} />
                  Show info on hover
                </label>
              </div>

              {/* Action history */}
              <Draggable nodeRef={historyRef} handle=".action-history-header">
                <div
                  ref={historyRef}
                  className="action-history-container"
                  onMouseDownCapture={() => console.log("mousedown on history (capture)")}
                >
                  <ActionHistory />
                </div>
              </Draggable>
            </div>
          </InspectContextReact.Provider>
        </SelectionProvider>
      </PlayersProvider>
    </GameStateProvider>
  );
}
