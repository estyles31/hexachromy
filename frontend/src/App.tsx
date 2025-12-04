import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import LobbyPage from "./pages/LobbyPage";
import GamePage from "./pages/GamePage";
import { fetchGameState } from "./api/gameState";

function GamePageWrapper() {
  const { gameId } = useParams();
  const [gameState, setGameState] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!gameId) return;

    setLoading(true);
    setError(null);

    fetchGameState(gameId)
      .then(data => setGameState(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading) {
    return <div>Loading game state...</div>;
  }

  if (error || !gameState) {
    return <div>{error ?? "Game not found."}</div>;
  }

  return <GamePage gameState={gameState} />;
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