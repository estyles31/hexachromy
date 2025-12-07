// counterStyles.ts (not .json)
export const systemStyles = {
  fringe: {
    background: "#e8e8e8",
    border: "#9a9a9a",
    text: "#000000",
    fog: "#4f4f40"
  },
  outer: {
    background: "#d2e3ff",
    border: "#8ca5c7",
    text: "#000000",
    fog: "#4f4f40"
  },
  inner: {
    background: "#ffecb3",
    border: "#d2b775",
    text: "#000000",
    fog: "#4f4f40"
  },
  throneworld: {
    background: "#ffd6d6",
    border: "#c78a8a",
    text: "#000000",
    fog: "#4f4f40"
  },
  homeworld: {
    background: "#fff7dd",
    border: "#d8c79a",
    text: "#000000",
    fog: "#4f4f40"
  },
  default: {
    background: "#dddddd",
    border: "#999999",
    text: "#000000",
    fog: "#4f4f40"
  }
} as const

export type SystemStyleKey = keyof typeof systemStyles;