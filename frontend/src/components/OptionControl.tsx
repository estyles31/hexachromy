import type { GameDefinitionOption } from "../../../shared/models/GameDefinition";

/* ------------------ Option Control ------------------ */
export function OptionControl({
  option, value, onChange,
}: {
  option: GameDefinitionOption;
  value: unknown;
  onChange(value: unknown): void;
}) {
  if(option.visible == false)
    return <></>;

  if (option.type === "checkbox") {
    return (
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={e => onChange(e.target.checked)} />
        <span>{option.label}</span>
      </label>
    );
  }

  if (option.type === "select") {
    return (
      <label>
        {option.label}
        <select
          value={String(value ?? "")}
          onChange={e => onChange(e.target.value)}
        >
          {option.choices?.map(choice => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label>
      {option.label}
      <input
        type="text"
        value={String(value ?? "")}
        onChange={e => onChange(e.target.value)} />
    </label>
  );
}
