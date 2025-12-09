import type { ScenarioDefinition } from "./ScenarioDefinition";

export type GameDefinitionOptionType = "select" | "checkbox" | "text";

export interface GameDefinitionOptionChoice {
  value: string;
  label: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface GameDefinitionOptionBase {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  type: GameDefinitionOptionType;
}

export interface GameDefinitionSelectOption extends GameDefinitionOptionBase {
  type: "select";
  choices: GameDefinitionOptionChoice[];
  defaultValue?: string;
}

export interface GameDefinitionCheckboxOption extends GameDefinitionOptionBase {
  type: "checkbox";
  defaultValue?: boolean;
}

export interface GameDefinitionTextOption extends GameDefinitionOptionBase {
  type: "text";
  defaultValue?: string;
  placeholder?: string;
}

export type GameDefinitionOption =
  | GameDefinitionSelectOption
  | GameDefinitionCheckboxOption
  | GameDefinitionTextOption;

export interface GameDefinition {
  id: string;
  name: string;
  description?: string;

  options?: GameDefinitionOption[];
  scenarios: ScenarioDefinition[];
}
