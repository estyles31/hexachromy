import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type HoveredSystemInfo from "../models/HoveredSystemInfo";
import type InspectContext from "../../../../shared/models/InspectContext";
import "./ThroneworldInfoPanel.css";

export default function ThroneworldInfoPanel({
  gameState,
  inspected,
}: {
  gameState: ThroneworldGameState;
  inspected: InspectContext<HoveredSystemInfo> | null;
}) {
  if (!inspected) return null;

  const systemInfo = inspected?.data;
  const hexId = systemInfo?.hexId ?? "unknown";
  const revealed = systemInfo?.revealed ??false;
  const system = gameState.state.systems[hexId]?.details;

  if (!system) {
    return (
      <div className="throneworld-info">
      <div>Unknown system</div>
      </div>
      );
  }

  if (!revealed) {
    return (
      <div className="throneworld-info">
        <div className="info-title">System {hexId}</div>
        <div className="info-value">Unrevealed</div>
      </div>
    );
  }

  const owner = system.owner ?? "Unclaimed";

  return (
    <div className="throneworld-info">
      <div className="info-title">System {hexId}</div>

      <div className="info-section">
        <div className="info-subtitle">Owner</div>
        <div className="info-value">{owner}</div>
      </div>

      <div className="info-section">
        <div className="info-subtitle">Development</div>
        <div className="info-value">{system.dev}</div>
      </div>

      {system.spaceUnits && (
        <div className="info-section">
          <div className="info-subtitle">Space Units</div>
          <div className="info-value">
            {formatUnits(system.spaceUnits)}
          </div>
        </div>
      )}

      {system.groundUnits && (
        <div className="info-section">
          <div className="info-subtitle">Ground Units</div>
          <div className="info-value">
            {formatUnits(system.groundUnits)}
          </div>
        </div>
      )}
    </div>
  );
}

function formatUnits(units: Partial<Record<string, number>>) {
  const entries = Object.entries(units).filter(([, n]) =>n && n > 0);
  if (!entries.length) return "None";
  return entries.map(([id, n]) => `${id} × ${n}`).join(", ");
}
