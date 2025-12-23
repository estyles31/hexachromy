// /modules/throneworld/functions/phases/GameStartPhase.ts
import { randomInt } from "crypto";
import { Phase, PhaseContext } from "../../../../shared-backend/Phase";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import type { StateDelta } from "../../../../shared/models/GameAction";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { Factions } from "../../shared/models/Factions.ThroneWorld";
import { buildUnit } from "../../shared/models/Unit.Throneworld";
import { ChooseRaceAction } from "../actions/ChooseRaceAction";
import { ChooseHomeworldAction } from "../actions/ChooseHomeworldAction";
import { createFleet } from "../../shared/models/Fleets.Throneworld";

export class GameStartPhase extends Phase {
  readonly name = "GameStart";

  /**
   * Called once when phase starts - handle random assignments
   */
  async onPhaseStart(ctx: PhaseContext): Promise<StateDelta[]> {
    const state = ctx.gameState as ThroneworldGameState;
    const deltas: StateDelta[] = [];

    // Set player order
    if (!state.playerOrder || state.playerOrder.length === 0) {
      const shuffled = this.shuffle(Object.keys(state.players));
      deltas.push({
        path: 'playerOrder',
        oldValue: state.playerOrder,
        newValue: shuffled,
        visibility: 'public'
      });
      // Apply locally so subsequent logic can use it
      state.playerOrder = shuffled;
    }

    // Set current player
    if (!state.state.currentPlayer) {
      deltas.push({
        path: 'state.currentPlayer',
        oldValue: undefined,
        newValue: state.playerOrder[0],
        visibility: 'public'
      });
      state.state.currentPlayer = state.playerOrder[0];
    }

    const raceMode = (state.options.raceAssignment as string) || "random";
    const homeworldMode = (state.options.homeworldAssignment as string) || "random";

    // Random race assignment
    if (raceMode === "random") {
      const raceDeltas = this.assignRacesRandomly(state);
      deltas.push(...raceDeltas);
      // Apply locally
      this.applyDeltas(state, raceDeltas);
    }

    // Random homeworld assignment
    if (homeworldMode === "random") {
      const hwDeltas = this.assignHomeworldsRandomly(state);
      deltas.push(...hwDeltas);
      // Apply locally
      this.applyDeltas(state, hwDeltas);
    }

    console.log("GameStartPhase onPhaseStart generated deltas:", JSON.stringify(deltas));

    // If both random, skip directly to Outreach
    if (raceMode === "random" && homeworldMode === "random") {
      deltas.push({
        path: 'state.currentPhase',
        oldValue: 'GameStart',
        newValue: 'Outreach',
        visibility: 'public'
      });
    }

    return deltas;
  }

  protected async getPhaseSpecificActions(
    ctx: PhaseContext,
    playerId: string
  ): Promise<LegalActionsResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const player = state.players[playerId];

    if (!player) {
      return { actions: [], message: "Player not found" };
    }

    // Not player's turn
    if (state.state.currentPlayer !== playerId) {
      return {
        actions: [],
        message: "Waiting for other players..."
      };
    }

    const raceMode = (state.options.raceAssignment as string) || "random";
    const homeworldMode = (state.options.homeworldAssignment as string) || "random";

    // Race selection (if not random and not yet chosen)
    if (raceMode !== "random" && !player.race) {
      return {
        actions: [new ChooseRaceAction()],
        message: "Choose your race"
      };
    }

    // Homeworld selection (if not random and not yet chosen)
    if (homeworldMode !== "random" && !this.playerHasHomeworld(state, playerId)) {
      return {
        actions: [new ChooseHomeworldAction()],
        message: "Choose your homeworld"
      };
    }

    // Player has completed setup
    return {
      actions: [],
      message: "Waiting for other players..."
    };
  }

  // ========== Random Assignment Helpers ==========

  private assignRacesRandomly(state: ThroneworldGameState): StateDelta[] {
    const deltas: StateDelta[] = [];
    const playerIds = Object.keys(state.players);
    const availableRaces = this.shuffle(Object.keys(Factions));

    playerIds.forEach((playerId, index) => {
      const raceId = availableRaces[index];
      const player = state.players[playerId];

      deltas.push({
        path: `players.${playerId}.race`,
        oldValue: player.race,
        newValue: raceId,
        visibility: 'public'
      });

      const faction = Factions[raceId];
      deltas.push({
        path: `players.${playerId}.tech`,
        oldValue: player.tech,
        newValue: { ...faction.StartingTech },
        visibility: 'public'
      });
    });

    return deltas;
  }

  private assignHomeworldsRandomly(state: ThroneworldGameState): StateDelta[] {
    const deltas: StateDelta[] = [];
    const playerIds = this.shuffle(Object.keys(state.players));
    const availableHomeworlds = this.getAvailableHomeworlds(state);

    playerIds.forEach((playerId, index) => {
      const hexId = availableHomeworlds[index];
      if (hexId) {
        deltas.push(...this.assignHomeworldToPlayer(state, playerId, hexId));
      }
    });

    return deltas;
  }

  private assignHomeworldToPlayer(
    state: ThroneworldGameState,
    playerId: string,
    hexId: string
  ): StateDelta[] {
    const deltas: StateDelta[] = [];
    const player = state.players[playerId];
    const system = state.state.systems[hexId];

    if (!player || !system || !player.race) return deltas;

    // Set owner
    deltas.push({
      path: `state.systems.${hexId}.details.owner`,
      oldValue: system.details?.owner,
      newValue: playerId,
      visibility: 'public'
    });

    // Mark revealed
    deltas.push({
      path: `state.systems.${hexId}.revealed`,
      oldValue: system.revealed,
      newValue: true,
      visibility: 'owner',
      ownerId: playerId
    });

    // Build starting units
    const bunkId = player.race === "Q" ? "qC" : "C";
    const existing = system.unitsOnPlanet[playerId] ?? [];
    const newUnits = [
      buildUnit(bunkId, playerId),
      buildUnit(bunkId, playerId)
    ];

    deltas.push({
      path: `state.systems.${hexId}.unitsOnPlanet.${playerId}`,
      oldValue: existing,
      newValue: [...existing, ...newUnits],
      visibility: 'public'
    });

    const exFleets = system.fleetsInSpace[playerId] ?? [];
    const newFleets = [
      createFleet(buildUnit("Sv", playerId)),
      createFleet(buildUnit("Sv", playerId)),
      createFleet(buildUnit("Sh", playerId)),
    ];
    
    deltas.push({
      path: `state.systems.${hexId}.fleetsInSpace.${playerId}`,
      oldValue: exFleets,
      newValue: [...exFleets, ...newFleets],
      visibility: 'public'
    })

    return deltas;
  }

  // ========== Query Helpers ==========

  private getAvailableHomeworlds(state: ThroneworldGameState): string[] {
    const available: string[] = [];
    for (const [hexId, system] of Object.entries(state.state.systems)) {
      if (system.worldType === "Homeworld" && !system.details?.owner) {
        available.push(hexId);
      }
    }
    return available;
  }

  private playerHasHomeworld(state: ThroneworldGameState, playerId: string): boolean {
    for (const system of Object.values(state.state.systems)) {
      if (system.worldType === "Homeworld" && system.details?.owner === playerId) {
        return true;
      }
    }
    return false;
  }

  // ========== Utility ==========

  private shuffle<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Apply deltas locally to state (for use within onPhaseStart)
   * This allows subsequent logic to see the changes before they're persisted
   */
  private applyDeltas(state: any, deltas: StateDelta[]): void {
    for (const delta of deltas) {
      const pathParts = delta.path.split('.');
      let target: any = state;

      // Navigate to parent
      for (let i = 0; i < pathParts.length - 1; i++) {
        target = target[pathParts[i]];
      }

      // Set value
      const finalKey = pathParts[pathParts.length - 1];
      target[finalKey] = delta.newValue;
    }
  }
}