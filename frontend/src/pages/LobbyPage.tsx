import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import LoginProfile from "../components/LoginProfile";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { authFetch } from "../utils/authFetch";
import type { GameSummary } from "../../../shared/models/GameSummary";

export default function LobbyPage() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [authDiagnostics, setAuthDiagnostics] = useState<string | null>(null);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);
  const [tokenMeta, setTokenMeta] = useState<{ issuedAt?: string; expiresAt?: string } | null>(
    null,
  );
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  const authContextSummary = useMemo(() => {
    if (!user) return "<no user>";

    const parts = [`uid=${user.uid}`];

    if (user.email) parts.push(`email=${user.email}`);
    if (tokenPreview) parts.push(`token=${tokenPreview}`);
    if (tokenMeta?.issuedAt) parts.push(`issuedAt=${tokenMeta.issuedAt}`);
    if (tokenMeta?.expiresAt) parts.push(`expiresAt=${tokenMeta.expiresAt}`);

    return parts.join(" | ");
  }, [tokenMeta, tokenPreview, user]);

  useEffect(() => {
    let cancelled = false;

    const captureToken = async () => {
      if (!user) {
        setTokenPreview(null);
        setTokenMeta(null);
        return;
      }

      try {
        const result = await user.getIdTokenResult();

        if (cancelled) return;

        setTokenPreview(`${result.token.slice(0, 12)}...`);
        setTokenMeta({ issuedAt: result.issuedAtTime, expiresAt: result.expirationTime });
      } catch (err) {
        if (!cancelled) {
          setTokenPreview("<failed to fetch token>");
          setTokenMeta(null);
          console.error("Failed to fetch ID token", err);
        }
      }
    };

    void captureToken();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const formatResponseError = async (response: Response, requestLabel: string) => {
    const text = await response.text();

    return [
      `${requestLabel} failed (${response.status} ${response.statusText})`,
      `url=${response.url || "<unknown>"}`,
      `auth=${authContextSummary}`,
      `responseBody=${text || "<empty body>"}`,
    ].join(" | ");
  };

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setError("Please sign in to view games.");
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const loadGames = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await authFetch(user, "/api/games", { debug: true });

        if (!response.ok) {
          throw new Error(await formatResponseError(response, "GET /api/games"));
        }

        const data = (await response.json()) as GameSummary[];

        if (!cancelled) {
          setGames(data);
        }
      } catch (err) {
        if (!cancelled) {
          const messagePrefix = err instanceof Error ? err.message : "Unknown error";
          setError(`${messagePrefix} | auth=${authContextSummary}`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadGames();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCreateGame = async () => {
    setCreateError(null);
    setCreating(true);

    try {
      if (!user) {
        throw new Error("Please sign in to create a game.");
      }

      const response = await authFetch(user, "/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameType: "throneworld",
          scenario: "6p",
          playerIds: [user?.uid ?? "anonymous"],
        }),
      });

      if (!response.ok) {
        throw new Error(await formatResponseError(response, "POST /api/games"));
      }

      const payload = (await response.json()) as { gameId?: string; id?: string };
      const gameId = payload.gameId ?? payload.id;

      if (!gameId) {
        throw new Error("Response did not include a gameId");
      }

      navigate(`/game/${gameId}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  const handleAuthDiagnostics = async () => {
    setAuthDiagnostics("Running diagnostics...");

    try {
      if (!user) {
        throw new Error("No user is currently signed in.");
      }

      const response = await authFetch(user, "/api/debug/auth", { debug: true });

      if (!response.ok) {
        throw new Error(await formatResponseError(response, "GET /api/debug/auth"));
      }

      const payload = await response.json();

      setAuthDiagnostics(JSON.stringify(payload, null, 2));
    } catch (err) {
      setAuthDiagnostics(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div>
      <LoginProfile />
      <h1>Hexachromy Lobby</h1>
      <button onClick={handleCreateGame} disabled={creating}>
        {creating ? "Creating..." : "Create New Game"}
      </button>
      {createError ? <div style={{ color: "red" }}>{createError}</div> : null}

      <div style={{ marginTop: "0.5rem", fontFamily: "monospace", fontSize: "0.9rem" }}>
        <div><strong>Auth context:</strong> {authContextSummary}</div>
        <div>
          <strong>Token timing:</strong> {tokenMeta?.issuedAt ? `issued ${tokenMeta.issuedAt}` : "<unknown>"}
          {tokenMeta?.expiresAt ? ` | expires ${tokenMeta.expiresAt}` : ""}
        </div>
      </div>

      {loading ? (
        <div>Loading games...</div>
      ) : error ? (
        <div style={{ color: "red" }}>Error loading games: {error}</div>
      ) : (
        <ul>
          {games.map((game: GameSummary) => {
            const gameId = game.id ?? (game as { gameId?: string }).gameId;

            if (!gameId) return null;

            return (
              <li
                key={gameId}
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/game/${gameId}`)}
              >
                <strong>{game.name}</strong> — Players: {game.players.join(", ")} — Status: {game.status}
              </li>
            );
          })}
        </ul>
      )}

      <div style={{ marginTop: "1rem" }}>
        <button onClick={handleAuthDiagnostics} disabled={creating}>
          Run auth diagnostics
        </button>
        {authDiagnostics ? (
          <pre style={{ background: "#f6f8fa", padding: "0.5rem", overflowX: "auto" }}>
            {authDiagnostics}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
