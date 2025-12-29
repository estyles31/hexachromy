// /frontend/src/pages/game/ActionPanel.tsx
import "./ActionPanel.css";
import { useSelection } from "../../../../shared-frontend/contexts/SelectionContext";
import { useEffect, useState, useMemo } from "react";
import type { ActionFinalize } from "../../../../shared/models/GameAction";
import { authFetch } from "../../auth/authFetch";
import { useAuth } from "../../auth/useAuth";
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";
import { getFrontendModule } from "../../modules/getFrontendModule";

/**
 * Displays:
 *  - Guidance messages for incomplete actions
 *  - Finalization buttons for complete actions
 *  - Auto-executes single trivial complete actions
 *  - Allows canceling current selection
 */
export default function ActionPanel() {
  const {
    legalActions,
    filledParams,
    select,
    executeAction,
    cancelAction,
  } = useSelection();

  const user = useAuth();
  const gameState = useGameStateContext();
  const gameId = gameState.gameId;
  
  const module = getFrontendModule(gameState.gameType);

  const [finalizeInfo, setFinalizeInfo] = useState<Record<string, ActionFinalize>>({});

  // Memoize to prevent infinite loop in useEffect
  const completeActions = useMemo(() => 
    legalActions.actions.filter(action => 
      action.params.every(p => p.optional || p.value !== undefined)
    ),
    [legalActions.actions]
  );

  const hasCompleteActions = completeActions.length > 0;
  const hasSelection = Object.keys(filledParams).length > 0;

  // ────────────────────────────────────────────────
  // Action guidance messages (next required params)
  // ────────────────────────────────────────────────
  const actionMessages = legalActions.actions
    .map(action => {
      const nextParam = action.params.find(p => !p.optional && (p.value === undefined || p.value === null));
      return nextParam?.message;
    })
    .filter((m): m is string => Boolean(m));

  const showMessages = actionMessages.length > 0 && !hasCompleteActions;

  // ────────────────────────────────────────────────
  // Load finalize info for complete actions
  // ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadFinalizeInfo() {
      if (!user || completeActions.length === 0) {
        setFinalizeInfo({});
        return;
      }

      const info: Record<string, ActionFinalize> = {};

      for (const action of completeActions) {
        const res = await authFetch(user, `/api/games/${gameId}/finalize-info`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        if (!res.ok) continue;
        info[action.type] = await res.json();
      }

      if (!cancelled) {
        setFinalizeInfo(info);
      }
    }

    loadFinalizeInfo();
    return () => { cancelled = true; };
  }, [user, gameId, completeActions]);

  // ────────────────────────────────────────────────
  // AUTO EXECUTION:
  // exactly one complete action + no finalize label
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (completeActions.length !== 1) return;

    const action = completeActions[0];
    const fin = finalizeInfo[action.type];

    if (fin && !fin.label) {
      executeAction(action);
    }
  }, [completeActions, finalizeInfo, executeAction]);

  // ────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────
  return (
    <div className={`action-panel ${!hasCompleteActions && !hasSelection ? "empty" : ""}`}>

      {/* Guidance messages */}
      {showMessages && (
        <div className="action-panel__messages">
          {actionMessages.map((m, i) => (
            <div key={i} className="action-message">{m}</div>
          ))}
        </div>
      )}

      {/* Choice buttons for incomplete actions */}
      {legalActions.actions.some(action => 
        action.params.some(p => (p.value === undefined || p.value === null) && p.choices?.length)
      ) && (
        <div className="action-panel__buttons">
          {legalActions.actions.map(action => {
            const nextParam = action.params.find(p => (p.type !== "boardSpace") && (p.type !== "gamePiece") 
                                                  && (p.value === undefined || p.value === null));
            if (!nextParam?.choices || nextParam.choices.length === 0) return null;

            // Render choice buttons
            return nextParam.choices.map(choice => {
              // Check for custom renderer based on param subtype
              const CustomRenderer = nextParam.subtype && module?.choiceRenderers?.[nextParam.subtype];
              
              if (CustomRenderer) {
                return <CustomRenderer key={choice.id} choice={choice} onClick={() => select(choice.id)} />;
              }

              // Default text button
              return (
                <button
                  key={choice.id}
                  className="action-panel__button action-panel__button--choice"
                  onClick={() => select(choice.id)}
                >
                  {choice.label || choice.id}
                  {!!choice.metadata?.cost && ` (${choice.metadata.cost})`}
                </button>
              );
            });
          }).flat()}
        </div>
      )}

      {/* No actions at all */}
      {!showMessages && !hasCompleteActions && legalActions.actions.length === 0 && (
        <div className="action-message">No actions available</div>
      )}

      {/* Finalization buttons */}
      {hasCompleteActions && (
        <>
          <div className="action-panel__header">Confirm Action</div>
          <div className="action-panel__buttons">
            {completeActions.map(action => {
              const fin = finalizeInfo[action.type];

              return (
                <button
                  key={action.type}
                  className="action-panel__button action-panel__button--primary"
                  onClick={() => executeAction(action)}
                >
                  {fin?.label || action.type}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Cancel button when selection in progress */}
      {hasSelection && !hasCompleteActions && (
        <div className="action-panel__buttons">
          <button
            className="action-panel__button action-panel__button--secondary"
            onClick={cancelAction}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}