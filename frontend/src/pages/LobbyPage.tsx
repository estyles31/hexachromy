import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, endAt, getDocs, limit, orderBy, query, startAt } from "firebase/firestore";
import LoginProfile from "../components/LoginProfile";
import { auth, firestore } from "../firebase";
import { authFetch } from "../utils/authFetch";
import type { GameDefinition, GameDefinitionOption } from "../../../shared/models/GameDefinition";
import type { GameSummary } from "../../../shared/models/GameSummary";

function deriveDefaultOptions(definition?: GameDefinition | null): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  if (!definition?.options) return defaults;

  for (const option of definition.options) {
    if (option.type === "checkbox") {
      defaults[option.id] = Boolean(option.defaultValue);
    } else if (option.type === "select") {
      defaults[option.id] = option.defaultValue ?? option.choices?.[0]?.value ?? "";
    } else if (option.type === "text") {
      defaults[option.id] = option.defaultValue ?? "";
    }
  }

  return defaults;
}

function normalizeOptionValue(option: GameDefinitionOption, value: unknown): unknown {
  if (option.type === "checkbox") return Boolean(value);
  if (option.type === "select") return typeof value === "string" ? value : option.defaultValue ?? option.choices?.[0]?.value ?? "";
  if (option.type === "text") return typeof value === "string" ? value : option.defaultValue ?? "";
  return value;
}

type PlayerOption = { uid: string; displayName: string };

function PlayerSlotRow({
  index,
  value,
  onChange,
  disabled,
  searchPlayers,
}: {
  index: number;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled: boolean;
  searchPlayers: (term: string) => Promise<PlayerOption[]>;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<PlayerOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    const runSearch = async () => {
      const term = searchTerm.trim();
      if (term.length < 2) {
        setResults([]);
        return;
      }

      const found = await searchPlayers(term);
      if (!cancelled) {
        setResults(found);
      }
    };

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [searchPlayers, searchTerm]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 32, textAlign: "right" }}>#{index + 1}</span>
        <input
          type="text"
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
          placeholder={index === 0 ? "You" : "Search player name"}
          disabled={disabled}
          style={{ flex: 1 }}
        />
      </div>
      {index === 0 ? (
        <div style={{ fontSize: "0.9rem", color: "#666" }}>Host: {value ?? "<not signed in>"}</div>
      ) : (
        <select
          value={value ?? ""}
          onChange={event => onChange(event.target.value || null)}
          disabled={disabled}
          style={{ width: "100%" }}
        >
          <option value="">Unassigned</option>
          {results.map(option => (
            <option key={option.uid} value={option.uid}>
              {option.displayName} ({option.uid})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function LobbyPage() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [authDiagnostics, setAuthDiagnostics] = useState<string | null>(null);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);
  const [tokenMeta, setTokenMeta] = useState<{ issuedAt?: string; expiresAt?: string } | null>(null);
  const [gameDefinitions, setGameDefinitions] = useState<GameDefinition[]>([]);
  const [definitionsLoading, setDefinitionsLoading] = useState(false);
  const [createFormVisible, setCreateFormVisible] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<string>("");
  const [optionValues, setOptionValues] = useState<Record<string, unknown>>({});
  const [playerSlots, setPlayerSlots] = useState<(string | null)[]>([]);
  const [fillWithBots, setFillWithBots] = useState(false);
  const [playerSearchCache, setPlayerSearchCache] = useState<Record<string, PlayerOption[]>>({});
  const [gameName, setGameName] = useState<string>("");
  const [searchParams] = useSearchParams();
  const debugMode = searchParams.get("debug") === "true";
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  const selectedDefinition = useMemo(
    () => gameDefinitions.find(definition => definition.id === selectedGameType),
    [gameDefinitions, selectedGameType],
  );

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

  useEffect(() => {
    if (selectedDefinition) {
      setOptionValues(current => {
        const defaults = deriveDefaultOptions(selectedDefinition);
        const merged = { ...defaults, ...current } as Record<string, unknown>;

        selectedDefinition.options?.forEach(option => {
          if (option.type === "select") {
            const hasChoice = option.choices.some(choice => choice.value === merged[option.id]);
            if (!hasChoice) {
              merged[option.id] = option.defaultValue ?? option.choices?.[0]?.value ?? "";
            }
          }
        });

        return merged;
      });
    } else if (gameDefinitions[0]) {
      setSelectedGameType(gameDefinitions[0].id);
      setOptionValues(deriveDefaultOptions(gameDefinitions[0]));
    }
  }, [selectedDefinition, gameDefinitions]);

  const requiredPlayers = useMemo(() => {
    const boardOption = selectedDefinition?.options?.find(option => option.id === "boardId" && option.type === "select");
    if (!boardOption || boardOption.type !== "select") return undefined;

    const currentValue = optionValues[boardOption.id];
    const choice =
      boardOption.choices.find(entry => entry.value === currentValue) ||
      boardOption.choices.find(entry => entry.value === boardOption.defaultValue) ||
      boardOption.choices[0];

    const metadata = choice?.metadata as { playerCount?: unknown } | undefined;
    return typeof metadata?.playerCount === "number" ? metadata.playerCount : undefined;
  }, [optionValues, selectedDefinition]);

  const searchPlayers = useCallback(async (term: string): Promise<PlayerOption[]> => {
    const cacheKey = term.trim().toLowerCase();
    const queryTerm = term.trim();
    if (cacheKey.length < 2) return [];

    if (playerSearchCache[cacheKey]) return playerSearchCache[cacheKey];

    const profileQuery = query(
      collection(firestore, "profiles"),
      orderBy("displayName"),
      startAt(queryTerm),
      endAt(`${queryTerm}\uf8ff`),
      limit(5),
    );

    const snapshot = await getDocs(profileQuery);
    const results: PlayerOption[] = snapshot.docs.map(doc => {
      const data = doc.data() as { displayName?: string };
      return { uid: doc.id, displayName: data.displayName ?? doc.id };
    });

    setPlayerSearchCache(current => ({ ...current, [cacheKey]: results }));
    return results;
  }, [playerSearchCache]);

  useEffect(() => {
    setPlayerSlots(current => {
      const slotCount = requiredPlayers ?? Math.max(current.length, 1);
      if (slotCount <= 0) return [];

      const next = Array.from({ length: slotCount }, (_, index) => {
        if (index === 0) return user?.uid ?? current[index] ?? null;
        return current[index] ?? null;
      });

      return next;
    });
  }, [requiredPlayers, user]);

  const loadDefinitions = async () => {
    if (!user || definitionsLoading) return;

    setDefinitionsLoading(true);
    setCreateError(null);

    try {
      const response = await authFetch(user, "/api/game-definitions", { debug: true });

      if (!response.ok) {
        throw new Error(await formatResponseError(response, "GET /api/game-definitions"));
      }

      const data = (await response.json()) as GameDefinition[];
      setGameDefinitions(data);

      if (!selectedGameType && data[0]) {
        setSelectedGameType(data[0].id);
        setOptionValues(deriveDefaultOptions(data[0]));
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to load game definitions");
    } finally {
      setDefinitionsLoading(false);
    }
  };

  const handleCreateGame = async () => {
    setCreateError(null);
    setCreating(true);

    try {
      if (!user) {
        throw new Error("Please sign in to create a game.");
      }

      if (!selectedDefinition) {
        throw new Error("No game selected. Load definitions and choose a game type.");
      }

      const normalizedSlots = playerSlots.map((slot, index) => (index === 0 ? user.uid : slot));

      const creationOptions = selectedDefinition.options?.reduce<Record<string, unknown>>((acc, option) => {
        const value = optionValues[option.id];
        const normalized = normalizeOptionValue(option, value);
        acc[option.id] = normalized;
        return acc;
      }, {}) ?? {};

      const response = await authFetch(user, "/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameType: selectedDefinition.id,
          playerSlots: normalizedSlots,
          fillWithBots: debugMode ? fillWithBots : undefined,
          name: gameName || undefined,
          options: creationOptions,
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

  const renderOptions = () => {
    if (!selectedDefinition?.options?.length) return null;

    return selectedDefinition.options.map(option => {
      if (option.type === "select") {
        const value = (optionValues[option.id] as string | undefined) ?? (option.choices?.[0]?.value ?? "");
        return (
          <label key={option.id}>
            {option.label}
            <select
              value={value}
              onChange={event =>
                setOptionValues(current => ({ ...current, [option.id]: event.target.value }))
              }
              style={{ display: "block", width: "100%", marginTop: 4 }}
            >
              {option.choices?.map(choice => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
            {option.description ? (
              <div style={{ fontSize: "0.9rem", color: "#555" }}>{option.description}</div>
            ) : null}
          </label>
        );
      }

      if (option.type === "checkbox") {
        const checked = Boolean(optionValues[option.id] ?? option.defaultValue ?? false);
        return (
          <label key={option.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={event =>
                setOptionValues(current => ({ ...current, [option.id]: event.target.checked }))
              }
            />
            {option.label}
            {option.description ? (
              <span style={{ fontSize: "0.9rem", color: "#555" }}>({option.description})</span>
            ) : null}
          </label>
        );
      }

      const value = (optionValues[option.id] as string | undefined) ?? "";
      return (
        <label key={option.id}>
          {option.label}
          <input
            type="text"
            value={value}
            onChange={event =>
              setOptionValues(current => ({ ...current, [option.id]: event.target.value }))
            }
            placeholder={option.placeholder ?? ""}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
          {option.description ? (
            <div style={{ fontSize: "0.9rem", color: "#555" }}>{option.description}</div>
          ) : null}
        </label>
      );
    });
  };

  const handleBeginCreate = () => {
    setCreateFormVisible(true);
    void loadDefinitions();
  };

  return (
    <div>
      <LoginProfile />
      <h1>Hexachromy Lobby</h1>

      {!createFormVisible ? (
        <div style={{ marginBottom: "1rem" }}>
          <button onClick={handleBeginCreate} disabled={!user || definitionsLoading}>
            {definitionsLoading ? "Loading..." : "Create Game"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480 }}>
          <label>
            Game type
            <select
              value={selectedGameType}
              onChange={event => setSelectedGameType(event.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              disabled={definitionsLoading}
            >
              {gameDefinitions.map(definition => (
                <option key={definition.id} value={definition.id}>
                  {definition.name}
                </option>
              ))}
            </select>
            {definitionsLoading ? <div>Loading definitions...</div> : null}
          </label>

          <label>
            Game name
            <input
              type="text"
              value={gameName}
              onChange={event => setGameName(event.target.value)}
              placeholder="Optional"
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>

          {renderOptions()}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontWeight: 600 }}>Players ({requiredPlayers ?? playerSlots.length || 1})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {playerSlots.map((slot, index) => (
                <PlayerSlotRow
                  key={index}
                  index={index}
                  value={slot}
                  disabled={index === 0}
                  searchPlayers={searchPlayers}
                  onChange={newValue =>
                    setPlayerSlots(current => current.map((existing, idx) => (idx === index ? newValue : existing)))
                  }
                />
              ))}
            </div>
            <div style={{ fontSize: "0.9rem", color: "#555" }}>
              Slots adjust to the selected board. Leave blank to open seats for invites or bots.
            </div>
            {debugMode ? (
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={fillWithBots}
                  onChange={event => setFillWithBots(event.target.checked)}
                />
                Fill empty spots with bots
              </label>
            ) : null}
          </div>

          <button onClick={handleCreateGame} disabled={creating || definitionsLoading}>
            {creating ? "Creating..." : "Create New Game"}
          </button>
          {createError ? <div style={{ color: "red" }}>{createError}</div> : null}
        </div>
      )}

      {loading ? (
        <div>Loading games...</div>
      ) : error ? (
        <div style={{ color: "red" }}>Error loading games: {error}</div>
      ) : (
        <ul>
          {games.map((game: GameSummary) => {
            const gameId = game.id ?? (game as { gameId?: string }).gameId;

            if (!gameId) return null;

            const playerNames = (game.players ?? []).map(player => player.name).join(", ");

            return (
              <li
                key={gameId}
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/game/${gameId}`)}
              >
                <strong>{game.name}</strong> — Players: {playerNames || "<none>"} — Status: {game.status}
              </li>
            );
          })}
        </ul>
      )}

      {debugMode ? (
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
      ) : null}
    </div>
  );
}
