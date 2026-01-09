// /frontend/src/components/ActionPanel.tsx
import "./ActionPanel.css";
import { useEffect, useMemo } from "react";
import { useSelection } from "../../../../shared-frontend/contexts/SelectionContext";
import { getFrontendModule } from "../../modules/getFrontendModule";
import { useAuth } from "../../auth/useAuth";
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";
import type { ActionParam } from "../../../../shared/models/GameAction";

/* ----------------------------------------
   Helpers
---------------------------------------- */

function getNextChoiceParam(action: { params: ActionParam[] }) {
  return action.params.find(
    (p) =>
      ["choice", "multichoice"].includes(p.type) && p.choices?.length && (p.value === undefined || p.value === null)
  );
}

function ButtonRow({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <div className="action-panel__buttons">{children}</div>;
}

/* ----------------------------------------
   Component
---------------------------------------- */

export default function ActionPanel() {
  const {
    legalActions,
    finalizeInfo,
    filledParams,
    isLoading,
    showLoadingOverlay,
    select,
    setParam,
    executeAction,
    cancelAction,
  } = useSelection();

  const user = useAuth();
  const gameState = useGameStateContext();
  const module = getFrontendModule(gameState.gameType);

  /* ----------------------------------------
     Derived state
  ---------------------------------------- */

  const completeActions = useMemo(
    () => legalActions.actions.filter((a) => a.params.every((p) => p.optional || p.value != null)),
    [legalActions.actions]
  );

  useEffect(() => {
    if (!isLoading && completeActions.length === 1 && !completeActions[0].finalize) {
      executeAction(completeActions[0]);
    }
  }, [completeActions, executeAction, isLoading]);

  const hasSelection = Object.keys(filledParams).length > 0;

  /* ----------------------------------------
     Early exits
  ---------------------------------------- */

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

  /* ----------------------------------------
     Render
  ---------------------------------------- */

  const actionMessages = legalActions.actions
    .map((action) => {
      const nextParam = action.params.find((p) => p.value == null);
      return nextParam?.message;
    })
    .filter((m): m is string => Boolean(m));

  const showMessages = actionMessages.length > 0;

  return (
    <div className={`action-panel ${legalActions.actions.length === 0 ? "empty" : ""}`}>
      {showMessages && (
        <div className="action-panel__messages">
          {actionMessages.map((m, i) => (
            <div key={i} className="action-message">
              {m}
            </div>
          ))}
        </div>
      )}

      {/* Custom parameter renderers for type="custom" */}
      {legalActions.actions.map((action) => {
        const nextParam = action.params.find((p) => p.value == null);
        if (!nextParam || nextParam.type !== "custom" || !nextParam.subtype) return null;

        const CustomParamRenderer = module?.parameterRenderers?.[nextParam.subtype];
        if (!CustomParamRenderer) return null;

        const currentValue = (filledParams[nextParam.name] as string[]) || [];
        return (
          <CustomParamRenderer
            action={action}
            key={nextParam.name}
            param={nextParam}
            value={currentValue}
            playerId={user?.uid || ""}
            onChange={(value) => setParam(nextParam.name, value)}
          />
        );
      })}

      <ButtonRow>
        {legalActions.actions.flatMap((action) => {
          const param = getNextChoiceParam(action);
          if (!param?.choices) return [];

          return param.choices.map((choice) => {
            const Custom = param.subtype && module?.choiceRenderers?.[param.subtype];

            return Custom ? (
              <Custom key={choice.id} playerId={user?.uid} choice={choice} onClick={() => select(choice.id)} />
            ) : (
              <button key={choice.id} className="action-panel__button" onClick={() => select(choice.id)}>
                {choice.label ?? choice.id}
              </button>
            );
          });
        })}
      </ButtonRow>

      {completeActions.length > 0 && (
        <ButtonRow>
          {completeActions.map((action) => (
            <button
              key={action.type}
              className="action-panel__button action-panel__button--primary"
              onClick={() => executeAction(action)}
            >
              {finalizeInfo[action.type]?.label ?? action.type}
            </button>
          ))}
        </ButtonRow>
      )}

      {hasSelection && (
        <ButtonRow>
          <button className="action-panel__button action-panel__button--secondary" onClick={cancelAction}>
            Cancel
          </button>
        </ButtonRow>
      )}
    </div>
  );
}
