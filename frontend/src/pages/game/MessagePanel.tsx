// /frontend/src/components/MessagePanel.tsx
import { useSelection } from "../../../../shared-frontend/contexts/SelectionContext";
import "./MessagePanel.css";

export default function MessagePanel() {
  const { selection, legalActions, resolvedActions } = useSelection();

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
