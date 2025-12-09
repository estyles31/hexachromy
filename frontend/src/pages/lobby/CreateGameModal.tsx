// /frontend/src/pages/lobby/CreateGameModal.tsx
import { useEffect, useMemo, useState, useRef } from "react";
import { authFetch } from "../../auth/authFetch";
import { useAuth } from "../../auth/useAuth";
import type { GameDefinition } from "../../../../shared/models/GameDefinition";
import { formatPlayerCount } from "../../../../shared/models/ScenarioDefinition";
import type { ModuleDescription } from "../../../../modules";
import type { CreateGameOptions } from "../../../../shared/models/CreateGameOptions";
import type { User } from "firebase/auth";
import "./CreateGameModal.css";
import Draggable from "react-draggable";
import PlayerSlotControl from "../../components/PlayerSlotControl";
import type { PlayerSlot } from "../../../../shared/models/PlayerSlot";
import { OptionControl } from "../../components/OptionControl";

interface Props {
  modules: ModuleDescription[];
  currentUserId: string;
  onCreate(payload: CreateGameOptions): void;
  onClose(): void;
}

async function loadGameDefinition(user: User | null | undefined, gameType: string): Promise<GameDefinition> {
  const res = await authFetch(user, `/api/game-definitions/${gameType}`);
  if (!res.ok) throw new Error("Failed to load game definition");
  return res.json();
}

export default function CreateGameModal({
  modules,
  currentUserId,
  onCreate,
  onClose,
}: Props) {
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [definition, setDefinition] = useState<GameDefinition | null>(null);
  const [loadingDefinition, setLoadingDefinition] = useState(false);
  const [definitionError, setDefinitionError] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [optionValues, setOptionValues] = useState<Record<string, unknown>>({});
  const [playerSlots, setPlayerSlots] = useState<PlayerSlot[]>([]);
  const [gameName, setGameName] = useState("");
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  const user = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);

  /* ------------------ Game ---------------------- */

  useEffect(() => {
    if (!moduleId) return;

    setLoadingDefinition(true);
    setDefinitionError(null);

    loadGameDefinition(user, moduleId)
      .then(def => setDefinition(def))
      .catch(err => setDefinitionError(String(err)))
      .finally(() => setLoadingDefinition(false));
  }, [moduleId]);

  /* ------------------ Scenario ------------------ */

  useEffect(() => {
    if (definition?.scenarios.length === 1) {
      setScenarioId(definition.scenarios[0].id);
    }
  }, [definition]);

  const scenario = useMemo(
    () => definition?.scenarios.find(s => s.id === scenarioId) ?? null,
    [definition, scenarioId],
  );

  /* ------------------ Player count ------------------ */

  useEffect(() => {
    if (!scenario) return;
    setPlayerCount(scenario.playerCount.value);
  }, [scenario]);

  const minPlayers = scenario?.playerCount.min ?? scenario?.playerCount.value;
  const maxPlayers = scenario?.playerCount.max ?? scenario?.playerCount.value;
  const isVariablePlayerCount = minPlayers !== maxPlayers;

  /* ------------------ Player slots ------------------ */

  // When player count changes:
  useEffect(() => {
    if (!playerCount) return;

    setPlayerSlots(prev =>
      Array.from({ length: playerCount }, (_, i): PlayerSlot => {
        if (i === 0) {
          // First slot is always the current user
          return {
            type: "human",
            slotIndex: i,
            uid: currentUserId,
            displayName: user?.displayName ?? user?.uid ?? "You", // or get from user profile
          };
        }

        const existing = prev[i];
        if (existing) return { ...existing, slotIndex: i };

        // Default to open slot
        return {
          type: "open",
          slotIndex: i,
        };
      }),
    );
  }, [playerCount, currentUserId]);

  /* ------------------ Options ------------------ */

  const resolvedOptions = useMemo(() => {
    const result: Record<string, unknown> = {};

    for (const option of definition?.options ?? []) {
      if (scenario?.settings?.fixed?.[option.id] !== undefined) {
        result[option.id] = scenario.settings.fixed[option.id];
      } else {
        result[option.id] =
          optionValues[option.id] ??
          option.defaultValue ??
          null;
      }
    }

    return result;
  }, [definition, scenario, optionValues]);

  /* ------------------ Create ------------------ */

  const handleCreate = () => {
    if (!scenario || !playerCount) return;

    onCreate({
      gameType: definition?.id ?? "throneworld",
      scenarioId: scenario.id,
      playerSlots,  // Send slots instead of player IDs
      options: resolvedOptions,
      name: gameName || undefined,
    });
  };

  /* ------------------ Render ------------------ */

  return (
    <div className="modal-backdrop">
      <Draggable handle=".modal-header" nodeRef={modalRef}>
        <div className="modal" ref={modalRef}>

          <header className="modal-header">
            <h2>Create Game</h2>
            <button className="closeButton" onClick={onClose}>✕</button>
          </header>

          <section className="modal-body">
            {/* Game */}
            <label>
              Game
              <select
                value={moduleId ?? ""}
                onChange={e => setModuleId(e.target.value)}
              >
                <option value="" disabled>Select game</option>
                {modules.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>

            {loadingDefinition && <div>Loading game definition...</div>}
            {definitionError && <div className="error">{definitionError}</div>}

            {/* Scenario */}
            {definition && definition.scenarios?.length > 1 && (
              <label>
                Scenario
                <select
                  value={scenarioId ?? ""}
                  onChange={e => setScenarioId(e.target.value)}
                >
                  <option value="" disabled>Select scenario</option>
                  {definition.scenarios.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Game name */}
            <label>
              Game name (optional)
              <input
                type="text"
                value={gameName}
                onChange={e => setGameName(e.target.value)}
              />
            </label>

            {/* Player count */}
            {scenario && (
              <label>
                Players ({formatPlayerCount(scenario.playerCount)})
                {isVariablePlayerCount && (
                  <input
                    type="number"
                    min={minPlayers}
                    max={maxPlayers}
                    value={playerCount ?? scenario.playerCount.value}
                    onChange={e => setPlayerCount(Number(e.target.value))}
                  />
                )}
              </label>
            )}

            {/* Options */}
            {scenario && definition && definition.options?.map(option => {
              const fixed = scenario.settings?.fixed?.[option.id];

              if (fixed !== undefined) {
                return (
                  <div key={option.id}>
                    <strong>{option.label}:</strong> {String(fixed)}
                  </div>
                );
              }

              return (
                <OptionControl
                  key={option.id}
                  option={option}
                  value={resolvedOptions[option.id]}
                  onChange={value =>
                    setOptionValues(v => ({ ...v, [option.id]: value }))
                  }
                />
              );
            })}

            {/* Players */}
            {playerCount != null && (
              <>
                {playerSlots.map((slot, i) => (
                  <PlayerSlotControl
                    key={i}
                    slot={slot}
                    slotIndex={i}
                    isCurrentUser={i === 0}
                    onChange={newSlot => {
                      const updated = [...playerSlots];
                      updated[i] = newSlot;
                      setPlayerSlots(updated);
                    }}
                  />
                ))}
              </>
            )}

          </section>

          <footer className="modal-footer">
            <button onClick={handleCreate} disabled={!scenario || !playerCount}>
              Create Game
            </button>
          </footer>
        </div>
      </Draggable>
    </div>
  );
}
