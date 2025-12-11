// /frontend/src/components/ActionPanel.tsx
import { useState, useEffect } from "react";
import { auth } from "../../../shared-frontend/firebase";
import { authFetch } from "../auth/authFetch";
import { useAuthState } from "react-firebase-hooks/auth";
import type { GameAction, LegalActionsResponse } from "../../../shared/models/ApiContexts";
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
  const [user] = useAuthState(auth);
  const [legalActions, setLegalActions] = useState<LegalActionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  // Load legal actions
  useEffect(() => {
    if (!user) return;

    const loadActions = async () => {
      try {
        const response = await authFetch(user, `/api/games/${gameId}/actions`);
        if (response.ok) {
          const data = await response.json();
          setLegalActions(data);
        }
      } catch (error) {
        console.error("Error loading legal actions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadActions();
  }, [gameId, user, gameVersion]);

  const executeAction = async (action: GameAction) => {
    if (!user || executing) return;

    setExecuting(true);
    try {
      const response = await authFetch(user, `/api/games/${gameId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: {
            ...action,
            expectedVersion: gameVersion,
          },
        }),
      });

      if (response.ok) {
        onActionTaken();
      } else if (response.status === 409) {
        alert("Game state changed. Please refresh.");
        onActionTaken();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to execute action");
      }
    } catch (error) {
      console.error("Error executing action:", error);
      alert("Failed to execute action");
    } finally {
      setExecuting(false);
    }
  };

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
