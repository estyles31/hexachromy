import { useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { authFetch } from "../../auth/authFetch";
import LoginProfile from "./LoginProfile";
import { GameList } from "./GameList";
import { useLobbyGames } from "./LobbyGames";
import { useNavigate } from "react-router-dom";
import CreateGameModal from "./CreateGameModal";
import { ModuleList } from "../../../../modules";
import type { CreateGameOptions } from "../../../../shared/models/CreateGameOptions";
import ProfileModal from "./ProfileModal";
import "./LobbyPage.css";

export default function LobbyPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const user = useAuth();
  const navigate = useNavigate();
  const { games, loading, error } = useLobbyGames();
  const [profileComplete, setProfileComplete] = useState(true); // Optimistic
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!user) return;

    authFetch(user, "/api/profiles/me")
      .then(r => r.json())
      .then(profile => setProfileComplete(profile.profileComplete))
      .catch(console.error);
  }, [user]);

  const handleCreateGame = async (payload: CreateGameOptions) => {
    if (!user) return;

    setCreating(true);
    setCreateError(null);

    try {
      const response = await authFetch(user, "/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Create game failed (${response.status}): ${text}`);
      }

      const data = (await response.json()) as { gameId?: string; id?: string };
      const gameId = data.gameId ?? data.id;

      if (!gameId) {
        throw new Error("Server response did not include gameId");
      } else {
        setCreateError(null);
      }

      navigate(`/game/${gameId}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="lobby-page">
      <LoginProfile onOpenSettings={() => setShowSettings(true)} />

      <header>
        <h1>Hexachromy Lobby</h1>
        {user && !creating && (<button onClick={() => setShowCreate(true)}>Create Game</button>)}
      </header>

      {createError && <div className="error">{createError}</div>}
      {creating && <div>Creating game…</div>}

      <GameList
        games={games}
        loading={loading}
        error={error}
        onSelect={id => navigate(`/game/${id}`)}
      />

      {showCreate && user && (
        <CreateGameModal
          modules={ModuleList}
          currentUserId={user?.uid}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateGame}
        />
      )}

      {((user && !profileComplete) || showSettings) && (
        <ProfileModal user={user!} onClose={() => { setProfileComplete(true); setShowSettings(false); }} />
      )}
    </div>
  );
}

