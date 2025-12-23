// /frontend/src/components/MessagePanel.tsx
import { useLegalActions } from "../../../../shared-frontend/hooks/useLegalActions";
import { useSelection } from "../../../../shared-frontend/contexts/SelectionContext";
import "./MessagePanel.css";
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";

export default function MessagePanel() {
  const gameState = useGameStateContext();
  const { legalActions } = useLegalActions(gameState.gameId, gameState.version);
  const { selection, resolvedActions } = useSelection();

  const backendMessage = legalActions?.message ?? null;

  // Collect warnings from all resolved actions (if any)
  const warnings: string[] = [];
  for (const action of resolvedActions) {
    const ws = action.finalize?.warnings;
    if (ws && ws.length) {
      warnings.push(...ws);
    }
  }

  // If literally nothing useful to say, hide panel
  if (!backendMessage && warnings.length === 0 && selection.items.length === 0) {
    return null;
  }

  return (
    <div className="message-panel">
      {warnings.length > 0 && (
        <ul className="message-panel__warnings">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {backendMessage && (
        <div className="message-panel__text">
          {backendMessage}
        </div>
      )}
    </div>
  );
}
