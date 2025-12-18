// /modules/throneworld/frontend/components/ThroneworldMessagePanel.tsx
import { useSelection } from "../../../../shared-frontend/contexts/SelectionContext";

/**
 * Throneworld message panel content.
 * Returns null when there's nothing to show (hides the panel).
 */
export default function ThroneworldMessagePanel() {
  const {
    selection,
    activeAction,
    nextParamMessage,
    canFinalize,
    finalizeLabel,
    finalizeMetadata,
    clearSelection,
    executeAction,
    legalActions,
  } = useSelection();

  // Build dynamic label for jump action
  const getDisplayLabel = () => {
    if (activeAction?.type !== "jump" || !finalizeMetadata) {
      return finalizeLabel || activeAction?.type || "Execute";
    }

    const meta = finalizeMetadata as {
      willInitiateCombat?: boolean;
      willScanHex?: boolean;
      willRevealHex?: boolean;
    };

    if (meta.willInitiateCombat) return "Jump (Combat!)";
    if (meta.willScanHex) return "Jump & Scan";
    if (meta.willRevealHex) return "Jump & Reveal";
    return finalizeLabel || "Jump";
  };

  // Build message
  const getMessage = () => {
    if (nextParamMessage) return nextParamMessage;
    if (canFinalize) return null; // Just show the button

    const hasScanOrJump = legalActions.some(a => a.type === "scan" || a.type === "jump");
    if (hasScanOrJump && selection.items.length === 0) {
      return "Select a Command Bunker to scan or jump";
    }

    return null;
  };

  const message = getMessage();
  const hasSelection = selection.items.length > 0;

  // Nothing to show
  if (!message && !canFinalize && !hasSelection) {
    return null;
  }

  return (
    <>
      {message && <div className="message-panel__text">{message}</div>}
      
      {(canFinalize || hasSelection) && (
        <div className="message-panel__actions">
          {canFinalize && (
            <button 
              className="message-panel__button message-panel__button--primary"
              onClick={executeAction}
            >
              {getDisplayLabel()}
            </button>
          )}
          {hasSelection && (
            <button 
              className="message-panel__button message-panel__button--cancel"
              onClick={clearSelection}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </>
  );
}
