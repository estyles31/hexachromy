// /frontend/src/components/ActionPanel.tsx
import React, { useState } from "react";
import { useLegalActions } from "../../../shared-frontend/hooks/useLegalActions";
import type { GameAction, ActionParameter } from "../../../shared/models/ApiContexts";
import { useActionExecutor } from "../hooks/useActionExecutor";
import "./ActionPanel.css";
import { useParameterValues } from "../hooks/useParameterValues";

interface Props {
  gameId: string;
  gameVersion: number;
  onActionTaken: () => void;
  onParameterSelectionChange?: (selection: {
    parameterName: string;
    highlightedHexes?: string[];
    onHexSelected: (hexId: string) => void;
  } | undefined) => void;
}

export default function ActionPanel({ 
  gameId, 
  gameVersion, 
  onActionTaken,
  onParameterSelectionChange
}: Props) {
  const { legalActions, loading } = useLegalActions(gameId, gameVersion);
  const { executeAction, executing } = useActionExecutor(gameId, gameVersion, onActionTaken);

  // Track which action is being built and its collected parameters
  const [activeAction, setActiveAction] = useState<GameAction | null>(null);
  const [collectedParams, setCollectedParams] = useState<Record<string, unknown>>({});

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

  const handleStartAction = (action: GameAction) => {
    if (action.parameters && action.parameters.length > 0) {
      // Multi-parameter action - start collecting parameters
      setActiveAction(action);
      setCollectedParams({});
    } else {
      // Simple action - execute immediately
      executeAction(action);
    }
  };  

  const handleCancelAction = () => {
    setActiveAction(null);
    setCollectedParams({});
    onParameterSelectionChange?.(undefined);
  };  

  const handleParameterSelected = (paramName: string, value: unknown) => {
    const newParams = { ...collectedParams, [paramName]: value };
    setCollectedParams(newParams);

    // Check if all parameters are now collected
    if (activeAction?.parameters) {
      const allCollected = activeAction.parameters.every(p => p.name in newParams);
      
      if (allCollected) {
        // Execute the action with all parameters
        const completeAction = {
          ...activeAction,
          ...newParams,
        };
        delete completeAction.parameters; // Remove parameter definitions
        
        executeAction(completeAction);
        setActiveAction(null);
        setCollectedParams({});
        onParameterSelectionChange?.(undefined);
      }
    }
  };

  // If we're building a multi-parameter action
  if (activeAction) {
    return (
      <MultiParameterActionPanel
        action={activeAction}
        collectedParams={collectedParams}
        onParameterSelected={handleParameterSelected}
        onCancel={handleCancelAction}
        gameId={gameId}
        onParameterSelectionChange={onParameterSelectionChange}
      />
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
                onClick={() => handleStartAction(action)}
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

// Component for collecting multi-parameter actions
function MultiParameterActionPanel({
  action,
  collectedParams,
  onParameterSelected,
  onCancel,
  gameId,
  onParameterSelectionChange,
}: {
  action: GameAction;
  collectedParams: Record<string, unknown>;
  onParameterSelected: (name: string, value: unknown) => void;
  onCancel: () => void;
  gameId: string;
  onParameterSelectionChange?: (selection: {
    parameterName: string;
    highlightedHexes?: string[];
    onHexSelected: (hexId: string) => void;
  } | undefined) => void;
}) {
  if (!action.parameters) return null;

  // Find the next parameter that needs to be collected
  const nextParam = action.parameters.find(p => !(p.name in collectedParams));
  
  if (!nextParam) return null;

  // Check if this parameter depends on others
  const canCollect = !nextParam.dependsOn || 
                     nextParam.dependsOn.every(dep => dep in collectedParams);

  if (!canCollect) {
    return (
      <div className="action-panel">
        <div className="action-message">Waiting for dependencies...</div>
      </div>
    );
  }

  return (
    <div className="action-panel multi-parameter">
      <div className="action-header">
        <h3>{action.renderHint?.label || action.type}</h3>
        <button onClick={onCancel} className="cancel-button">✕</button>
      </div>

      <ParameterSelector
        actionType={action.type}
        parameter={nextParam}
        collectedParams={collectedParams}
        onSelect={onParameterSelected}
        gameId={gameId}
        onParameterSelectionChange={onParameterSelectionChange}
      />

      {Object.keys(collectedParams).length > 0 && (
        <div className="collected-params">
          <div className="param-label">Selected:</div>
          {Object.entries(collectedParams).map(([key, value]) => (
            <div key={key} className="param-value">
              {key}: {String(value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Component for selecting a single parameter value
function ParameterSelector({
  actionType,
  parameter,
  collectedParams,
  onSelect,
  gameId,
  onParameterSelectionChange,
}: {
  actionType: string;
  parameter: ActionParameter;
  collectedParams: Record<string, unknown>;
  onSelect: (name: string, value: unknown) => void;
  gameId: string;
  onParameterSelectionChange?: (selection: {
    parameterName: string;
    highlightedHexes?: string[];
    onHexSelected: (hexId: string) => void;
  } | undefined) => void;
}) {
  const { values, loading } = useParameterValues(
    gameId,
    actionType,
    parameter.name,
    collectedParams
  );

  // When values load for hex-select, notify parent so board can highlight
  React.useEffect(() => {
    if (loading || !values) return;
    
    const isHexSelect = values.renderHint?.category === "hex-select" || 
                       parameter.renderHint?.category === "hex-select";
    
    if (isHexSelect && onParameterSelectionChange) {
      onParameterSelectionChange({
        parameterName: parameter.name,
        highlightedHexes: values.renderHint?.highlightHexes,
        onHexSelected: (hexId: string) => {
          onSelect(parameter.name, hexId);
        },
      });
    }

    return () => {
      if (isHexSelect && onParameterSelectionChange) {
        onParameterSelectionChange(undefined);
      }
    };
  }, [loading, values, parameter.name, onParameterSelectionChange, onSelect, parameter.renderHint?.category]);

  if (loading) {
    return <div className="parameter-selector loading">Loading options...</div>;
  }

  if (!values || values.error) {
    return (
      <div className="parameter-selector error">
        {values?.error || "Failed to load options"}
      </div>
    );
  }

  const message = values.renderHint?.message || parameter.renderHint?.message || `Select ${parameter.name}`;

  // For hex-select parameters, the board will handle rendering highlights
  // We just show the message here
  if (values.renderHint?.category === "hex-select" || parameter.renderHint?.category === "hex-select") {
    return (
      <div className="parameter-selector hex-select">
        <div className="selection-message">{message}</div>
        <div className="selection-hint">Click a highlighted hex on the board</div>
      </div>
    );
  }

  // For other types, show a list of options
  return (
    <div className="parameter-selector">
      <div className="selection-message">{message}</div>
      <div className="parameter-options">
        {values.values.map((value, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(parameter.name, value)}
            className="parameter-option"
          >
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </button>
        ))}
      </div>
    </div>
  );
}