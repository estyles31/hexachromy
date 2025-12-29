// /frontend/src/components/MessagePanel.tsx
import { useSelection } from "../../../../shared-frontend/contexts/SelectionContext";
import "./MessagePanel.css";

export default function MessagePanel() {
  const { filledParams, legalActions } = useSelection();

  const backendMessage = legalActions?.message ?? null;

  // Find complete actions (all params filled)
  const completeActions = legalActions.actions.filter(action =>
    action.params.every(p => p.optional || p.value !== undefined)
  );

  // Collect warnings from all complete actions
  const warnings: string[] = [];
  for (const action of completeActions) {
    const ws = action.finalize?.warnings;
    if (ws && ws.length) {
      warnings.push(...ws);
    }
  }

  const hasSelection = Object.keys(filledParams).length > 0;

  // If literally nothing useful to say, hide panel
  if (!backendMessage && warnings.length === 0 && !hasSelection) {
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