import { useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";
import type { User } from "firebase/auth";
import { authFetch } from "../../auth/authFetch";
import { useAuth } from "../../auth/useAuth";
import type { GameDefinition } from "../../../../shared/models/GameDefinition";
import type { ModuleDescription } from "../../../../modules";
import type { CreateGameOptions } from "../../../../shared/models/CreateGameOptions";
import type { PlayerSlot } from "../../../../shared/models/PlayerSlot";
import { formatPlayerCount } from "../../../../shared/models/ScenarioDefinition";
import PlayerSlotControl from "./PlayerSlotControl";
import { OptionControl } from "./OptionControl";
import { EpicSpaceBattleNameGenerator } from "../../../../shared/utils/generateEpicSpaceBattleName";
import "./CreateGameModal.css";

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

function buildPlayerSlots(
  prev: PlayerSlot[],
  count: number,
  currentUserId: string,
  user: User | null | undefined
): PlayerSlot[] {
  return Array.from({ length: count }, (_, i): PlayerSlot => {
    if (i === 0) {
      return {
        type: "human",
        slotIndex: 0,
        uid: currentUserId,
        displayName: user?.displayName ?? user?.uid ?? "You",
      };
    }

    const existing = prev[i];
    if (existing) return { ...existing, slotIndex: i };

    return {
      type: "bot",
      slotIndex: i,
      botId: `bot-${crypto.randomUUID()}`,
      displayName: `Bot ${i + 1}`,
    };
  });
}

export default function CreateGameModal({ modules, currentUserId, onCreate, onClose }: Props) {
  const user = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  const namer = useRef(new EpicSpaceBattleNameGenerator()).current;

  /* -------------------------
   * State
   * ------------------------- */

  const [moduleId, setModuleId] = useState<string | null>(null);

  const [definition, setDefinition] = useState<GameDefinition | null>(null);
  const [loadingDefinition, setLoadingDefinition] = useState(false);
  const [definitionError, setDefinitionError] = useState<string | null>(null);

  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [optionValues, setOptionValues] = useState<Record<string, unknown>>({});

  // Single source of truth for “who’s playing”
  const [playerSlots, setPlayerSlots] = useState<PlayerSlot[]>([]);
  const [gameName, setGameName] = useState("");

  /* -------------------------
   * Derived “effective” definition/scenario (no cleanup effect)
   * ------------------------- */

  const effectiveDefinition = moduleId ? definition : null;

  const scenario = useMemo(() => {
    if (!effectiveDefinition) return null;

    if (effectiveDefinition.scenarios.length === 1) {
      return effectiveDefinition.scenarios[0];
    }

    return effectiveDefinition.scenarios.find((s) => s.id === scenarioId) ?? null;
  }, [effectiveDefinition, scenarioId]);

  const minPlayers = scenario?.playerCount.min ?? scenario?.playerCount.value;
  const maxPlayers = scenario?.playerCount.max ?? scenario?.playerCount.value;
  const isVariablePlayerCount = minPlayers !== maxPlayers;

  const playerCount = playerSlots.length;

  const resolvedOptions = useMemo(() => {
    if (!effectiveDefinition || !scenario) return {};

    const result: Record<string, unknown> = {};

    for (const option of effectiveDefinition.options ?? []) {
      if (scenario.settings?.fixed?.[option.id] !== undefined) {
        result[option.id] = scenario.settings.fixed[option.id];
      } else {
        result[option.id] = optionValues[option.id] ?? option.defaultValue ?? null;
      }
    }

    return result;
  }, [effectiveDefinition, scenario, optionValues]);

  /* -------------------------
   * Events (do state changes here, not in effects)
   * ------------------------- */

  const ensureGameName = () => {
    setGameName((prev) => (prev && prev.trim().length > 0 ? prev : namer.generate()));
  };

  const applyScenarioDefaults = (def: GameDefinition, nextScenarioId: string | null) => {
    const nextScenario =
      def.scenarios.length === 1 ? def.scenarios[0] : (def.scenarios.find((s) => s.id === nextScenarioId) ?? null);

    if (!nextScenario) {
      setPlayerSlots([]);
      return;
    }

    setPlayerSlots((prev) => buildPlayerSlots(prev, nextScenario.playerCount.value, currentUserId, user));
  };

  const onChangeModule = (nextModuleId: string) => {
    setModuleId(nextModuleId);
    ensureGameName();

    // Reset UI state immediately (event handler is fine; linter rule is about effects)
    setDefinition(null);
    setDefinitionError(null);
    setScenarioId(null);
    setOptionValues({});
    setPlayerSlots([]);

    setLoadingDefinition(true);
    loadGameDefinition(user, nextModuleId)
      .then((def) => {
        setDefinition(def);

        // If only one scenario, auto-select it and initialize slots.
        if (def.scenarios.length === 1) {
          const only = def.scenarios[0];
          setScenarioId(only.id);
          setPlayerSlots((prev) => buildPlayerSlots(prev, only.playerCount.value, currentUserId, user));
        }
      })
      .catch((err) => setDefinitionError(String(err)))
      .finally(() => setLoadingDefinition(false));
  };

  const onChangeScenario = (nextScenarioId: string) => {
    setScenarioId(nextScenarioId);

    if (effectiveDefinition) {
      applyScenarioDefaults(effectiveDefinition, nextScenarioId);
    } else {
      // Defensive; shouldn’t happen, but keep behavior sane.
      setPlayerSlots([]);
    }
  };

  const rerollGameName = () => {
    setGameName(namer.generate());
  };

  const handleCreate = () => {
    if (!scenario || playerSlots.length === 0) return;

    let name = gameName.trim();
    if (name.length < 2) name = namer.generate();

    onCreate({
      gameType: effectiveDefinition?.id ?? "throneworld",
      scenarioId: scenario.id,
      playerSlots,
      options: resolvedOptions,
      name,
    });
  };

  /* -------------------------
   * Render
   * ------------------------- */

  return (
    <div className="modal-backdrop">
      <Draggable handle=".modal-header" nodeRef={modalRef}>
        <div className="modal" ref={modalRef}>
          <header className="modal-header">
            <h2>Create Game</h2>
            <button className="closeButton" onClick={onClose}>
              ✕
            </button>
          </header>

          <section className="modal-body">
            {/* Game */}
            <label>
              Game
              <select
                value={moduleId ?? ""}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!next) return;
                  onChangeModule(next);
                }}
              >
                <option value="" disabled>
                  Select game
                </option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>

            {loadingDefinition && <div>Loading game definition...</div>}
            {definitionError && <div className="error">{definitionError}</div>}

            {/* Scenario */}
            {effectiveDefinition && effectiveDefinition.scenarios.length > 1 && (
              <label>
                Scenario
                <select value={scenarioId ?? ""} onChange={(e) => onChangeScenario(e.target.value)}>
                  <option value="" disabled>
                    Select scenario
                  </option>
                  {effectiveDefinition.scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Game name */}
            <label>
              <div className="game-name-row">
                Game name
                <button type="button" className="reroll-button" onClick={rerollGameName}>
                  🎲
                </button>
              </div>
              <input type="text" value={gameName} onChange={(e) => setGameName(e.target.value)} />
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
                    value={playerCount}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setPlayerSlots((prev) => buildPlayerSlots(prev, next, currentUserId, user));
                    }}
                  />
                )}
              </label>
            )}

            {/* Options */}
            {scenario &&
              effectiveDefinition?.options?.map((option) => {
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
                    onChange={(value) => setOptionValues((v) => ({ ...v, [option.id]: value }))}
                  />
                );
              })}

            {/* Players */}
            {playerSlots.map((slot, i) => (
              <PlayerSlotControl
                key={i}
                slot={slot}
                slotIndex={i}
                isCurrentUser={i === 0}
                onChange={(newSlot) => {
                  const updated = [...playerSlots];
                  updated[i] = newSlot;
                  setPlayerSlots(updated);
                }}
              />
            ))}
          </section>

          <footer className="modal-footer">
            <button onClick={handleCreate} disabled={!scenario || playerSlots.length === 0}>
              Create Game
            </button>
          </footer>
        </div>
      </Draggable>
    </div>
  );
}
