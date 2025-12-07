export interface ThroneworldBoardDefinition {
  id: string;
  name: string;
  playerCount: number;
  scenario: string;
  description?: string;
}

export interface ThroneworldGameDefinition {
  boards: ThroneworldBoardDefinition[];
  defaultBoardId: string;
}

export const DEFAULT_THRONEWORLD_DEFINITION: ThroneworldGameDefinition = {
  defaultBoardId: "standard-6p",
  boards: [
    {
      id: "standard-6p",
      name: "Standard 6-Player",
      playerCount: 6,
      scenario: "6p",
      description: "Full map for six factions.",
    },
    {
      id: "pocket-4p",
      name: "Compact 4-Player",
      playerCount: 4,
      scenario: "4p",
      description: "Smaller map suited to quick matches.",
    },
  ],
};
