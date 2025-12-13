// /frontend/src/components/ActionPanel.tsx
import { useLegalActions } from "../../../shared-frontend/hooks/useLegalActions";
import { useActionExecutor } from "../hooks/useActionExecutor";
import "./ActionPanel.css";

interface Props {
  gameId: string;
  gameVersion: number;
  onActionTaken: () => void;
}

export default function ActionPanel({ 
  gameId, 
  gameVersion, 
  onActionTaken
}: Props) {
  const { legalActions, loading } = useLegalActions(gameId, gameVersion);
  const { executeAction, executing } = useActionExecutor(gameId, gameVersion, onActionTaken);

  if (loading) {
    return <div className="action-panel loading">Loading actions...</div>;
  }

  if (!legalActions || legalActions.actions.length === 0) {
    return (
      <div className="action-panel empty">
        {legalActions?.message || "No actions available"}
      </div>
    );
  }

  // Group actions by render category
  const buttonActions = legalActions.actions.filter(
    a => !a.renderHint || a.renderHint.category === "button"
  );
  const boardSelectActions = legalActions.actions.filter(
    a => a.renderHint?.category === "hex-select"
  );

  return (
    <div className="action-panel">
      {legalActions.message && (
        <div className="action-message">{legalActions.message}</div>
      )}

      {/* Button actions */}
      {buttonActions.length > 0 && (
        <div className="action-group">
          <div className="action-buttons">
            {buttonActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => executeAction(action)}
                disabled={executing}
                className="action-button"
                title={action.renderHint?.description}
              >
                {action.renderHint?.icon && (
                  <span className="action-icon">{action.renderHint.icon}</span>
                )}
                {action.renderHint?.label || action.type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Board selection info - just show the message */}
      {boardSelectActions.length > 0 && boardSelectActions[0].renderHint?.message && (
        <div className="action-group">
          <div className="action-info board-select-info">
            {boardSelectActions[0].renderHint.message}
          </div>
        </div>
      )}
    </div>
  );
}