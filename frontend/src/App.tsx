import { BrowserRouter, Routes, Route } from "react-router-dom";
import LobbyPage from "./pages/LobbyPage";

import { useParams } from "react-router-dom";
import { mockGameStates } from "./mock/mockGameStates";
import GamePage from "./pages/GamePage";

function GamePageWrapper() {
  const { gameId } = useParams();
  const gameState = mockGameStates[gameId!];

  if (!gameState) {
    return <div>Game not found.</div>;
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