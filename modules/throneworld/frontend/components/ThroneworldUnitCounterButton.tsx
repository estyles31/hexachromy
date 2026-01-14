// In modules/throneworld/frontend/components/ThroneworldUnitCounterButton.tsx:
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";
import type { ChoiceRendererProps } from "../../../../shared-frontend/FrontendModuleDefinition";
import { useInspect } from "../../../../shared-frontend/InspectContext";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type { UnitTypeId } from "../../shared/models/Units.Throneworld";
import { UNITS } from "../../shared/models/Units.Throneworld";
import type { HoveredUnitInfo } from "../models/HoveredInfo";
import ThroneworldUnitCounter from "./ThroneworldUnitCounter";

export default function ThroneworldUnitCounterButton({ choice, playerId, onClick }: ChoiceRendererProps) {
  const unittype = UNITS[choice.id as UnitTypeId];
  if (!unittype)
    return (
      <button onClick={onClick} className="action-panel__button">
        {choice.id}
      </button>
    );

  const state = useGameStateContext() as ThroneworldGameState;
  const playerColor = (playerId && state.players[playerId]?.color) || "transparent";
  const inspect = useInspect();

  const inspectData: HoveredUnitInfo = {
    kind: "unit",
    unitDef: unittype,
    unitId: unittype.id,
    quantity: 1,
    unit: {
      id: "",
      unitTypeId: unittype.id,
      owner: playerId || "neutral",
      hasMoved: false,
    },
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => {
        inspect({
          kind: "unit",
          id: unittype.id,
          data: inspectData,
        });
      }}
      onMouseLeave={() => inspect(null)}
      style={{ cursor: "pointer", display: "inline-block", margin: "4px" }}
      title={`${unittype.Name} (${choice.metadata?.cost})`}
    >
      <ThroneworldUnitCounter unit={unittype} quantity={1} hasMoved={false} playerColor={playerColor} size={32} />
    </div>
  );
}
