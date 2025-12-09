import type { GameDefinition } from "../../../../shared/models/GameDefinition";

export const ThroneworldGameDefinition : GameDefinition = 
{
  id: "throneworld",
  name: "Throne World",
  description: "",

  options: [ 
      {
        id: "boardImage",
        label: "Board",
        type: "text",
        visible: false,
        defaultValue: "throneworld-6p.svg",
        description: "The board to play on."
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
      {
        id: "startScannedForAll",
        label: "Start with all tiles scanned",
        description: "Debug: reveal every system for all players",
        type: "checkbox",
        defaultValue: false,
      }
    ],
  scenarios: [
     {
        id: "duel-2p",
        label: "2 Player Duel",
        playerCount: { value: 2 },
        // description: "Tight two-player duel layout.",
        settings: {
          fixed: { boardImage: "/modules/throneworld/boards/throneworld-2p.svg" }
        },
      },
      {
        id: "trio-3p",
        label: "3 Player",
        playerCount: { value: 3 },
        // description: "Three-player balance of distance and pressure.",
        settings: { 
          fixed: { boardImage: "/modules/throneworld/boards/throneworld-3p.svg" }
        },
      },
      {
        id: "standard-4p",
        label: "4 Player Standard",
        playerCount: { value: 4 },
        // description: "Baseline four-player setup.",
        settings: { 
          fixed: { boardImage: "/modules/throneworld/boards/throneworld-4p.svg" }
        },
      },
      {
        id: "expanse-5p",
        label: "5 Player",
        playerCount: { value: 5 },
        // description: "Five-player reach across the spiral arms.",
        settings: { 
          fixed: { boardImage: "/modules/throneworld/boards/throneworld-5p.svg" }
        },
      },
      {
        id: "standard-6p",
        label: "6 Player Full Game",
        playerCount: { value: 6 },
        // description: "Classic six-player experience.",
        settings: { 
          fixed: { boardImage: "/modules/throneworld/boards/throneworld-6p.svg" }
        },
      },
  ],
}
