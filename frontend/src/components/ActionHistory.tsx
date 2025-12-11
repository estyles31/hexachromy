// /frontend/src/components/ActionHistory.tsx
import { useState, useEffect } from "react";
import { auth } from "../../../shared-frontend/firebase";
import { authFetch } from "../auth/authFetch";
import { useAuthState } from "react-firebase-hooks/auth";
import "./ActionHistory.css";

interface ActionHistoryEntry {
  actionId: string;
  sequence: number;
  timestamp: number;
  playerId: string;
  action: {
    type: string;
    message?: string;
    [key: string]: unknown;
  };
  undone?: boolean;
  resultingPhase: string;
}

interface Props {
  gameId: string;
  gameVersion: number;
  playerNames: Record<string, string>;
}

export default function ActionHistory({ gameId, gameVersion, playerNames }: Props) {
  const [user] = useAuthState(auth);
  const [isExpanded, setIsExpanded] = useState(true);
  const [actions, setActions] = useState<ActionHistoryEntry[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  // Load action history
  useEffect(() => {
    if (!user) return;

    const loadActions = async () => {
      try {
        const response = await authFetch(user, `/api/games/${gameId}/actionLog`);
        if (response.ok) {
          const data = await response.json();
          setActions(data.actions || []);
        }
      } catch (error) {
        console.error("Error loading action history:", error);
      }
    };

    loadActions();
  }, [gameId, user, gameVersion]);

  // Check if can undo
  useEffect(() => {
    if (!user) return;

    const checkCanUndo = async () => {
      try {
        const response = await authFetch(user, `/api/games/${gameId}/actions`);
        if (response.ok) {
          const data = await response.json();
          setCanUndo(data.canUndo || false);
        }
      } catch (error) {
        console.error("Error checking undo:", error);
      }
    };

    checkCanUndo();
  }, [gameId, user, gameVersion]);

  const handleSendChat = async () => {
    if (!user || !chatMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await authFetch(user, `/api/games/${gameId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: {
            type: "chat",
            message: chatMessage.trim(),
            undoable: true,
            expectedVersion: gameVersion,
          },
        }),
      });

      if (response.ok) {
        setChatMessage("");
        window.dispatchEvent(new Event("gameStateChanged"));
      } else if (response.status === 409) {
        alert("Game state changed. Please refresh.");
        window.dispatchEvent(new Event("gameStateChanged"));
      } else {
        const error = await response.json();
        alert(error.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending chat:", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleUndo = async () => {
    if (!user || !canUndo) return;

    try {
      const response = await authFetch(user, `/api/games/${gameId}/undo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: gameVersion }),
      });

      if (response.ok) {
        window.dispatchEvent(new Event("gameStateChanged"));
      } else if (response.status === 409) {
        alert("Game state changed. Please refresh.");
        window.dispatchEvent(new Event("gameStateChanged"));
      } else {
        const error = await response.json();
        alert(error.error || "Failed to undo");
      }
    } catch (error) {
      console.error("Error undoing:", error);
      alert("Failed to undo");
    }
  };

  const formatAction = (entry: ActionHistoryEntry): string => {
    const playerName = playerNames[entry.playerId] || "Unknown";
    
    if (entry.action.type === "chat") {
      return `${playerName}: ${entry.action.message}`;
    }
    
    return `${playerName} performed ${entry.action.type}`;
  };

  if (!isExpanded) {
    return (
      <div className="action-history collapsed">
        <button 
          className="expand-button"
          onClick={() => setIsExpanded(true)}
        >
          📜 Action History
        </button>
      </div>
    );
  }

  return (
    <div className="action-history">
      <div className="action-history-header">
        <h3>Action History</h3>
        <button 
          className="collapse-button"
          onClick={() => setIsExpanded(false)}
        >
          ×
        </button>
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
          placeholder="Type message..."
          disabled={sending}
          maxLength={500}
        />
        <button onClick={handleSendChat} disabled={sending || !chatMessage.trim()}>
          Send
        </button>
        {canUndo && (
          <button onClick={handleUndo} className="undo-button" title="Undo last action">
            ↶
          </button>
        )}
      </div>

      <div className="action-list">
        {actions
          .filter(a => !a.undone)
          .map((entry) => (
            <div key={entry.actionId} className="action-entry">
              <span className="action-sequence">#{entry.sequence}</span>
              <span className="action-text">{formatAction(entry)}</span>
            </div>
          ))}
        {actions.length === 0 && (
          <div className="no-actions">No actions yet. Send a chat to test!</div>
        )}
      </div>
    </div>
  );
}
