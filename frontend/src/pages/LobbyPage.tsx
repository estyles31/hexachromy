import { useEffect, useState } from "react";
// import React from "react";
import LoginProfile from "../components/LoginProfile";
import { useNavigate } from "react-router-dom";
import { mockGames } from "../mock/mockGameIndex";
import type { GameSummary } from "../../../shared/models/GameSummary";

export default function LobbyPage() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setGames(mockGames);
  }, []);

  return (
    <div>
      <LoginProfile />
      <h1>Hexachromy Lobby</h1>
      <button>Create New Game</button>

      <ul>
        {games.map((game: GameSummary) => (
          <li
            key={game.id}
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/game/${game.id}`)}
          >
            <strong>{game.name}</strong> — Players: {game.players.join(", ")} — Status: {game.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
