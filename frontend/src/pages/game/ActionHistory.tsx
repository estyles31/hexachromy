// /frontend/src/components/ActionHistory.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../../auth/useAuth";
import { authFetch } from "../../auth/authFetch";
import "./ActionHistory.css";
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";

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

interface ChatEntry {
  playerId: string;
  message: string;
  timestamp: number;
  undone?: boolean; //should we allow unchat?
}

type FeedEntry =
  | ({ kind: "action" } & ActionHistoryEntry)
  | ({ kind: "chat" } & ChatEntry);

export default function ActionHistory() {
  const user = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [actions, setActions] = useState<ActionHistoryEntry[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const gameState = useGameStateContext();
  const gameId = gameState.gameId;

  const [showActions, setShowActions] = useState(true);
  const [showChat, setShowChat] = useState(true);

  const [chat, setChat] = useState<ChatEntry[]>([]);

  const feed: FeedEntry[] = [
    ...(showActions ? actions.map((a) : FeedEntry => ({ kind: "action", ...a })) : []),
    ...(showChat ? chat.map((c) : FeedEntry => ({ kind: "chat", ...c })) : []),
  ];

  feed.sort((a, b) => b.timestamp - a.timestamp);


  useEffect(() => {
    if (!user || !showChat) return;

    const loadChat = async () => {
      try {
        const response = await authFetch(user, `/api/games/${gameId}/chat?limit=200`);

        if (response.ok) {
          const data = await response.json();
          setChat(data.messages || []);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };

    loadChat();
  }, [gameId, user, showChat, gameState.version]);

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
  }, [gameId, user, gameState.version]);

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
  }, [gameId, user, gameState.version]);

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
            expectedVersion: gameState.version,
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
      // Fetch current game state to get the latest version
      const stateResponse = await authFetch(user, `/api/games/${gameId}/view`);
      if (!stateResponse.ok) {
        alert("Failed to fetch current game state");
        return;
      }

      const currentState = await stateResponse.json();
      const currentVersion = currentState.version;

      // Now send undo with the current version
      const response = await authFetch(user, `/api/games/${gameId}/undo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: currentVersion }),
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
    const playerName = gameState.players[entry.playerId]?.displayName || "Unknown";

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
        <div className="display-toggle-bar">
        <label>
          <input
            type="checkbox"
            checked={showActions}
            onChange={() => setShowActions(!showActions)}
          />
          Show Actions
        </label>

        <label>
          <input
            type="checkbox"
            checked={showChat}
            onChange={() => setShowChat(!showChat)}
          />
          Show Chat
        </label>
      </div>
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
        {feed
          .filter(a => !a.undone)
          .map((entry) => entry.kind === "chat" ? (
            <div key={`chat-${entry.timestamp}-${entry.playerId}}`} className="chat-entry">
              <span className="chat-name">
                {gameState.players[entry.playerId]?.displayName ?? "Unknown"}:
              </span>
              <span className="chat-message">{entry.message}</span>
            </div>
          ) : (
            <div key={entry.actionId} className="action-entry">
              <span className="action-sequence">#{entry.sequence}</span>
              <span className="action-text">{formatAction(entry)}</span>
            </div>
          )
          )}
      </div>
    </div>
  );
}