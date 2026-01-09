// /shared-frontend/components/MultiChoiceParam.tsx
// Basic multiChoice renderer for the base app
import type { ActionParam } from "../../shared/models/GameAction";

interface MultiChoiceParamProps {
  param: ActionParam<string[]>;
  value: string[];
  onChange: (value: string[]) => void;
}

export function MultiChoiceParam({ param, value, onChange }: MultiChoiceParamProps) {
  const selectedIds = new Set(value || []);

  const toggleChoice = (choiceId: string) => {
    const newValue = new Set(selectedIds);
    if (newValue.has(choiceId)) {
      newValue.delete(choiceId);
    } else {
      newValue.add(choiceId);
    }
    onChange(Array.from(newValue));
  };

  if (!param.choices || param.choices.length === 0) {
    return <div className="multi-choice-param multi-choice-param--empty">No choices available</div>;
  }

  return (
    <div className="multi-choice-param">
      <div className="multi-choice-param__message">{param.message}</div>
      <div className="multi-choice-param__choices">
        {param.choices.map((choice) => (
          <label key={choice.id} className="multi-choice-param__choice">
            <input type="checkbox" checked={selectedIds.has(choice.id)} onChange={() => toggleChoice(choice.id)} />
            <span className="multi-choice-param__choice-label">{choice.label || choice.id}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
