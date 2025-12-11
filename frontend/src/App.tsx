import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import LobbyPage from "./pages/lobby/LobbyPage";
import GamePage from "./pages/game/GamePage";
import { useGameState } from "../../shared-frontend/hooks/useGameState";

function GamePageWrapper() {
  const { gameId } = useParams();
  const { state, loading, error } = useGameState(gameId ?? "");

  // No longer need manual refetch - Firestore listener handles it automatically

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