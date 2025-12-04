export const mockGameState = {
  phase: "Expansion",
  currentPlayer: "Alice",

  systems: [
    { id: "s1", x: 400, y: 200, ownerColor: "red" },
    { id: "s2", x: 500, y: 350, ownerColor: "blue" },
    { id: "s3", x: 300, y: 420, ownerColor: "gray" },
  ],

  objects: [
    { id: "u1", image: "/units/ship.png", x: 390, y: 190 },
    { id: "u2", image: "/units/troop.png", x: 510, y: 340 },
  ],

  highlights: [
    { x: 500, y: 350 }
  ],

  players: [
    { id: "p1", name: "Alice", systems: 4, credits: 6, tech: ["Jump 2"] },
    { id: "p2", name: "Bob", systems: 3, credits: 5, tech: ["Attack 1"] }
  ]
};
