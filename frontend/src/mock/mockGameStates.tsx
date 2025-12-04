import { mockGameState } from "./mockGameState";

export const mockGameStates: Record<string, any> = {
  game1: mockGameState,
  game2: {
    ...mockGameState,
    phase: "Empire",
    currentPlayer: "Carol"
  }
};
