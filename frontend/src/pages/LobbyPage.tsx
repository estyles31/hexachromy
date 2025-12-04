import React, { useEffect, useState } from "react";
import LoginProfile from "../components/LoginProfile";

interface Game {
  id: string;
  name: string;
  players: string[];
  status: "waiting" | "in-progress" | "completed";
}

export default function LobbyPage() {
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    // TODO: Replace with real API call to Firebase Function to fetch games
    const stubGames: Game[] = [
      { id: "game1", name: "Throne World #1", players: ["Alice", "Bob"], status: "in-progress" },
      { id: "game2", name: "Throne World #2", players: ["Carol"], status: "waiting" },
    ];
    setGames(stubGames);
  }, []);

  return (
    <div>
      <LoginProfile />
      <h1>Hexachromy Lobby</h1>
      <button>Create New Game</button>
      <ul>
        {games.map((game) => (
          <li key={game.id}>
            <strong>{game.name}</strong> - Players: {game.players.join(", ")} - Status: {game.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
