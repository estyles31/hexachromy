// In modules/throneworld/frontend/components/ThroneworldUnitCounterButton.tsx:
import type { ChoiceRendererProps } from "../../../../shared-frontend/FrontendModuleDefinition";
import type { UnitTypeId } from "../../shared/models/UnitTypes.ThroneWorld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import ThroneworldUnitCounter from "./ThroneworldUnitCounter";

export default function ThroneworldUnitCounterButton({ choice, onClick }: ChoiceRendererProps) {
  const unit = UNITS[choice.id as UnitTypeId];
  if (!unit) return <button onClick={onClick} className="action-panel__button">{choice.id}</button>;
  
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', display: 'inline-block', margin: '4px' }} title={`${unit.Name} (${choice.metadata?.cost})`}>
      <ThroneworldUnitCounter unit={unit} quantity={1} hasMoved={false} playerColor="transparent" size={32} />
    </div>
  );
}