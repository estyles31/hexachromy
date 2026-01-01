// In modules/throneworld/frontend/components/ThroneworldUnitCounterButton.tsx:
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";
import type { ChoiceRendererProps } from "../../../../shared-frontend/FrontendModuleDefinition";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type { UnitTypeId } from "../../shared/models/UnitTypes.ThroneWorld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import ThroneworldUnitCounter from "./ThroneworldUnitCounter";

export default function ThroneworldUnitCounterButton({ choice, playerId, onClick }: ChoiceRendererProps) {
  const unit = UNITS[choice.id as UnitTypeId];
  if (!unit) return <button onClick={onClick} className="action-panel__button">{choice.id}</button>;

  const state = useGameStateContext() as ThroneworldGameState;

  const playerColor = (playerId && state.players[playerId]?.color) || "transparent";
  
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', display: 'inline-block', margin: '4px' }} title={`${unit.Name} (${choice.metadata?.cost})`}>
      <ThroneworldUnitCounter unit={unit} quantity={1} hasMoved={false} playerColor={playerColor} size={32} />
    </div>
  );
}