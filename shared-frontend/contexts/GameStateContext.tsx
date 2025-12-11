// /frontend/src/contexts/GameStateContext.tsx
import { createContext, useContext, type ReactNode } from "react";
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

export function PlayersProvider({ 
  players, 
  children 
}: { 
  players: Record<string, Player>; 
  children: ReactNode;
}) {
  return (
    <PlayersContext.Provider value={players}>
      {children}
    </PlayersContext.Provider>
  );
}

export function usePlayers() {
  const context = useContext(PlayersContext);
  if (context === null) {
    throw new Error("usePlayers must be used within PlayersProvider");
  }
  return context;
}

// Context for game-specific state (systems, board, etc.)
const GameSpecificStateContext = createContext<any>(null);

export function GameSpecificStateProvider({ 
  state, 
  children 
}: { 
  state: any; 
  children: ReactNode;
}) {
  return (
    <GameSpecificStateContext.Provider value={state}>
      {children}
    </GameSpecificStateContext.Provider>
  );
}

export function useGameSpecificState<T = any>() {
  const context = useContext(GameSpecificStateContext);
  if (context === null) {
    throw new Error("useGameSpecificState must be used within GameSpecificStateProvider");
  }
  return context as T;
}