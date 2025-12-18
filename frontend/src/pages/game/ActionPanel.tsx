// /frontend/src/components/ActionPanel.tsx
import { useLegalActions } from "../../../../shared-frontend/hooks/useLegalActions";
import { useActionExecutor } from "../../hooks/useActionExecutor";
import "./ActionPanel.css";

interface Props {
  gameId: string;
  gameVersion: number;
  onActionTaken: () => void;
}

export default function ActionPanel({
  gameId,
  gameVersion,
  onActionTaken,
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

  return (
    <div className="action-panel">
      {legalActions.message && (
        <div className="action-message">{legalActions.message}</div>
      )}

      <div className="action-buttons">
        {legalActions.actions.map((action, i) => (
          <button
            key={action.type + i}
            onClick={() => executeAction(action)}
            disabled={executing}
            className="action-button"
            title={action.renderHint?.description}
          >
            {action.renderHint?.label || action.type}
          </button>
        ))}
      </div>
    </div>
  );
}