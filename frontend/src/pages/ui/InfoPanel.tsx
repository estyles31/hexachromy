import type { HoveredSystemInfo } from "../../modules/types";

export default function InfoPanel({ gameState, hoveredSystem }: { gameState: any; hoveredSystem: HoveredSystemInfo | null }) {
  const phase = gameState?.phase ?? "—";
  const currentPlayer = gameState?.currentPlayer ?? "—";

  const details = hoveredSystem?.details;
  const owner = (details as { owner?: unknown } | undefined)?.owner;
  const ownerLabel = typeof owner === "string" ? owner : owner === null ? "Unclaimed" : "—";

  return (
    <div className="info-panel">
      <div className="info-section">
        <div className="info-title">Phase</div>
        <div className="info-value">{phase}</div>
        <div className="info-subtitle">Current Player</div>
        <div className="info-value">{currentPlayer}</div>
      </div>

      <div className="info-section">
        <div className="info-title">Hovered System</div>
        <div className="info-value">{hoveredSystem?.hexId ?? "—"}</div>

        <div className="info-subtitle">Owner</div>
        <div className="info-value">{hoveredSystem ? ownerLabel : "—"}</div>

        <div className="info-subtitle">Details</div>
        <div className="info-value">
          {hoveredSystem ? (
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {details ? JSON.stringify(details, null, 2) : "None"}
            </pre>
          ) : (
            "—"
          )}
        </div>
      </div>
    </div>
  );
}
