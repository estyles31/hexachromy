// /frontend/src/contexts/GameStateContext.tsx
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { GameState, Player } from "../../shared/models/GameState";

// Generic game state context
const GameStateContext = createContext<GameState<any> | null>(null);

export function GameStateProvider({ 
  gameState, 
  children 
}: { 
  gameState: GameState<any>; 
  children: ReactNode;
}) {
  return (
    <GameStateContext.Provider value={gameState}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameStateContext<T = any>() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error("useGameStateContext must be used within GameStateProvider");
  }
  return context as GameState<T>;
}

// Context for players slice
const PlayersContext = createContext<Record<string, Player> | null>(null);

export function PlayersProvider({ children }: { children: ReactNode }) {
  const { players } = useGameStateContext();
  const stablePlayers = useMemo(() => players, [players]);

  return (
    <PlayersContext.Provider value={stablePlayers}>
      {children}
    </PlayersContext.Provider>
  );
}

export function usePlayers() {
  const context = useContext(PlayersContext);
  if (!context) {
    throw new Error("usePlayers must be used within PlayersProvider");
  }
  return context;
}