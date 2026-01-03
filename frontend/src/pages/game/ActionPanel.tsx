import "./ActionPanel.css";
import { useSelection } from "../../../../shared-frontend/contexts/SelectionContext";
import { useMemo } from "react";
import { getFrontendModule } from "../../modules/getFrontendModule";
import { useAuth } from "../../auth/useAuth";
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";

export default function ActionPanel() {
  const {
    legalActions,
    finalizeInfo,
    filledParams,
    isLoading,
    showLoadingOverlay,
    select,
    executeAction,
    cancelAction,
  } = useSelection();

  const user = useAuth();
  const gameState = useGameStateContext();
  const module = getFrontendModule(gameState.gameType);

  const completeActions = useMemo(
    () => legalActions.actions.filter((a) => a.params.every((p) => p.optional || p.value != null)),
    [legalActions.actions]
  );

  const hasSelection = Object.keys(filledParams).length > 0;

  if (!isLoading && legalActions.actions.length === 0) {
    return null;
  }

  if (isLoading && showLoadingOverlay) {
    return (
      <div className="action-panel loading">
        <div className="action-panel__loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className={`action-panel ${legalActions.actions.length === 0 ? "empty" : ""}`}>
      {legalActions.actions.flatMap((action) => {
        const nextParam = action.params.find(
          (p) =>
            p.type !== "boardSpace" &&
            p.type !== "gamePiece" &&
            p.choices?.length &&
            (p.value === undefined || p.value === null)
        );

        if (!nextParam || !nextParam.choices) return [];

        return nextParam.choices.map((choice) => {
          const Custom = nextParam.subtype && module?.choiceRenderers?.[nextParam.subtype];
          return Custom ? (
            <Custom key={choice.id} playerId={user?.uid} choice={choice} onClick={() => select(choice.id)} />
          ) : (
            <button key={choice.id} onClick={() => select(choice.id)}>
              {choice.label}
            </button>
          );
        });
      })}

      {completeActions.length > 0 && (
        <>
          <div className="action-panel__header">Confirm Action</div>
          <div className="action-panel__buttons">
            {completeActions.map((action) => (
              <button key={action.type} onClick={() => executeAction(action)}>
                {finalizeInfo[action.type]?.label}
              </button>
            ))}
          </div>
        </>
      )}

      {hasSelection && <button onClick={cancelAction}>Cancel</button>}
    </div>
  );
}
