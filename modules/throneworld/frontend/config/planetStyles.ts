export const planetStyles = {
  default: { gradient: ["#999999", "#666666"], highlight: null },

  dev0: { gradient: ["#777777", "#555555"], highlight: null },
  dev1: { gradient: ["#dde6ff", "#aab2cc"], highlight: null },
  dev2: { gradient: ["#c7a57a", "#8c6e4c"], highlight: null },
  dev3: { gradient: ["#7bcb80", "#2f7a44"], highlight: "#aaffaa" },
  dev4: { gradient: ["#89d792", "#267a4d"], highlight: "#ddffee" },
  dev5: { gradient: ["#5ac8fa", "#004c99"], highlight: "#ffffff" },
  dev6: { gradient: ["#5ac8fa", "#003c88"], highlight: "#ffffff" },

  Homeworld: {
    gradient: ["#8ad47a", "#2f7a44"],
    highlight: "#eaffea"
  },

  Throneworld: {
    gradient: ["#6c3bcc", "#36206a"],
    highlight: "#ddb84e"
  }
}

export type PlanetStyleKey = keyof typeof planetStyles;
