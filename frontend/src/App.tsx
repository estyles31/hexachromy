import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { useEffect } from "react";
import LobbyPage from "./pages/lobby/LobbyPage";
import GamePage from "./pages/game/GamePage";
import { useGameState } from "./hooks/useGameState";

function GamePageWrapper() {
  const { gameId } = useParams();
  const { state, loading, error, refetch } = useGameState(gameId ?? "");

  // Listen for game state changes (from actions, undo, etc.)
  useEffect(() => {
    const handleStateChange = () => {
      refetch();
    };

    window.addEventListener("gameStateChanged", handleStateChange);
    return () => window.removeEventListener("gameStateChanged", handleStateChange);
  }, [refetch]);

  if (loading) return <div>Loading game...</div>;
  if (error) return <div>Error loading game: {error.message}</div>;
  if (!state) return <div>Game not found.</div>;

  return <GamePage gameState={state} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/game/:gameId" element={<GamePageWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}