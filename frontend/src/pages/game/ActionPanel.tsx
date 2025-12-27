// /frontend/src/components/ActionPanel.tsx
import "./ActionPanel.css";
import { useSelection } from "../../../../shared-frontend/contexts/SelectionContext";
import { useEffect, useState } from "react";
import type { ActionFinalize } from "../../../../shared/models/GameAction";
import { authFetch } from "../../auth/authFetch";
import { useAuth } from "../../auth/useAuth";
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";

/**
 * Displays:
 *  - Guidance messages for incomplete actions
 *  - All resolved (finalizable) actions
 *  - Auto-executes single trivial resolved actions
 *  - Allows canceling current selection
 */
export default function ActionPanel() {
  const {
    resolvedActions,
    legalActions,
    executeAction,
    candidateActions,
    cancelAction,
    selection,
  } = useSelection();

  const user = useAuth();
  const gameState = useGameStateContext();
  const gameId = gameState.gameId;

  const [finalizeInfo, setFinalizeInfo] =
    useState<Record<string, ActionFinalize>>({});

  const hasResolved = resolvedActions.length > 0;
  const hasSelection = selection.items.length > 0;

  // ────────────────────────────────────────────────
  // Action guidance messages (next required params)
  // ────────────────────────────────────────────────
  // note - these are intentionally not memoized, because that keeps them from updating
  // I am fine with these being re-rendered on any state change (because most will intentionally require a re-render)
  const actionMessages = (candidateActions ?? legalActions.actions)
    .map(action => {
      const nextParam = action.params.find(p => p.value == null);
      return nextParam?.message;
    })
    .filter((m): m is string => Boolean(m));
  const showMessages = actionMessages.length > 0 && !hasResolved;

  // ────────────────────────────────────────────────
  // Load finalize info for resolved actions
  // ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadFinalizeInfo() {
      if (!user || resolvedActions.length === 0) {
        setFinalizeInfo({});
        return;
      }

      const info: Record<string, ActionFinalize> = {};

      for (const action of resolvedActions) {
        const res = await authFetch(
          user,
          `/api/games/${gameId}/finalize-info`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          }
        );

        if (!res.ok) continue;
        info[action.type] = await res.json();
      }

      if (!cancelled) {
        setFinalizeInfo(info);
      }
    }

    loadFinalizeInfo();
    return () => { cancelled = true; };
  }, [user, gameId, resolvedActions]);

  // ────────────────────────────────────────────────
  // AUTO EXECUTION:
  // exactly one resolved action + no finalize label
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (resolvedActions.length !== 1) return;

    const action = resolvedActions[0];
    const fin = finalizeInfo[action.type];

    if (fin && !fin.label) {
      executeAction(action);
    }
  }, [resolvedActions, finalizeInfo, executeAction]);

  // ────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────
  return (
    <div className={`action-panel ${!hasResolved && !hasSelection ? "empty" : ""}`}>

      {/* Guidance messages */}
      {showMessages && (
        <div className="action-panel__messages">
          {actionMessages.map((m, i) => (
            <div key={i} className="action-message">
              {m}
            </div>
          ))}
        </div>
      )}

      {/* No actions at all */}
      {!showMessages && legalActions.actions.length === 0 && (
        <div className="action-message">
          No actions available
        </div>
      )}

      {/* Finalization buttons */}
      {hasResolved && (
        <>
          <div className="action-panel__header">Confirm Action</div>
          <div className="action-panel__buttons">
            {resolvedActions.map(action => {
              const fin = finalizeInfo[action.type];

              return (
                <button
                  key={action.type}
                  className="action-panel__button action-panel__button--primary"
                  onClick={() => executeAction(action)}
                >
                  {fin?.label ?? action.type}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Cancel selection */}
      {hasSelection && (
        <div className="action-panel__cancel">
          <button
            className="action-panel__button action-panel__button--cancel"
            onClick={cancelAction}
          >
            Cancel Selection
          </button>
        </div>
      )}
    </div>
  );
}
