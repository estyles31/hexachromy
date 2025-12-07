import type { GameDefinition, GameDefinitionOption } from "../../../../shared/models/GameDefinition";

export interface ThroneworldBoardDefinition {
  id: string;
  name: string;
  playerCount: number;
  scenario: string;
  description?: string;
  boardImage: string;
}

export interface ThroneworldGameDefinition extends GameDefinition {
  id: "throneworld";
  name: string;
  description?: string;
  boards: ThroneworldBoardDefinition[];
  defaultBoardId: string;
  options?: GameDefinitionOption[];
}

export function buildThroneworldDefinition(): ThroneworldGameDefinition {
  return {
    id: "throneworld",
    name: "Throneworld",
    description: "Explore, expand, and vie for the Throneworld.",
    defaultBoardId: "standard-4p",
    boards: [
      {
        id: "duel-2p",
        name: "Duel Map",
        playerCount: 2,
        scenario: "2p",
        description: "Tight two-player duel layout.",
        boardImage: "/modules/throneworld/boards/throneworld-2p.svg",
      },
      {
        id: "trio-3p",
        name: "Trinary Frontier",
        playerCount: 3,
        scenario: "3p",
        description: "Three-player balance of distance and pressure.",
        boardImage: "/modules/throneworld/boards/throneworld-3p.svg",
      },
      {
        id: "standard-4p",
        name: "Core Skirmish",
        playerCount: 4,
        scenario: "4p",
        description: "Baseline four-player setup.",
        boardImage: "/modules/throneworld/boards/throneworld-4p.svg",
      },
      {
        id: "expanse-5p",
        name: "Outer Expanse",
        playerCount: 5,
        scenario: "5p",
        description: "Five-player reach across the spiral arms.",
        boardImage: "/modules/throneworld/boards/throneworld-5p.svg",
      },
      {
        id: "standard-6p",
        name: "Full Constellation",
        playerCount: 6,
        scenario: "6p",
        description: "Classic six-player experience.",
        boardImage: "/modules/throneworld/boards/throneworld-6p.svg",
      },
    ],
    options: [
      {
        id: "boardId",
        label: "Board",
        description: "Choose a map sized to your player count.",
        type: "select",
        required: true,
        defaultValue: "standard-4p",
        choices: [
          {
            value: "duel-2p",
            label: "Duel Map — 2 players",
            description: "Head-to-head board",
            metadata: { playerCount: 2, scenario: "2p", boardImage: "/modules/throneworld/boards/throneworld-2p.svg" },
          },
          {
            value: "trio-3p",
            label: "Trinary Frontier — 3 players",
            description: "Three-player balance",
            metadata: { playerCount: 3, scenario: "3p", boardImage: "/modules/throneworld/boards/throneworld-3p.svg" },
          },
          {
            value: "standard-4p",
            label: "Core Skirmish — 4 players",
            description: "Four-player default",
            metadata: { playerCount: 4, scenario: "4p", boardImage: "/modules/throneworld/boards/throneworld-4p.svg" },
          },
          {
            value: "expanse-5p",
            label: "Outer Expanse — 5 players",
            description: "Five-player spread",
            metadata: { playerCount: 5, scenario: "5p", boardImage: "/modules/throneworld/boards/throneworld-5p.svg" },
          },
          {
            value: "standard-6p",
            label: "Full Constellation — 6 players",
            description: "Six-player epic",
            metadata: { playerCount: 6, scenario: "6p", boardImage: "/modules/throneworld/boards/throneworld-6p.svg" },
          },
        ],
      },
      {
        id: "startScannedForAll",
        label: "Start with all tiles scanned",
        description: "Debug: reveal every system for all players",
        type: "checkbox",
        defaultValue: false,
      },
      {
        id: "raceAssignment",
        label: "Race assignment",
        description: "Random for now; future option to let players pick",
        type: "select",
        defaultValue: "random",
        choices: [
          { value: "random", label: "Random" },
          { value: "playerChoice", label: "Player choice (future)" },
        ],
      },
      {
        id: "forceRandomRaces",
        label: "Force random races",
        description: "Override any player picks with random races (currently always on)",
        type: "checkbox",
        defaultValue: true,
      },
      {
        id: "homeworldAssignment",
        label: "Homeworld assignment",
        description: "Random now; later can follow player order",
        type: "select",
        defaultValue: "random",
        choices: [
          { value: "random", label: "Random" },
          { value: "playerOrder", label: "Player order (future)" },
        ],
      },
    ],
  };
}
