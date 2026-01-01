// /modules/throneworld/functions/actions/ChooseHomeworldAction.ts
import { ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import { buildUnit } from "../../shared/models/Unit.Throneworld";
import { createFleet } from "../../shared/models/Fleets.Throneworld";
import { pickRandom, shuffle } from "../../../../shared/utils/RandomUtils";

export class ChooseHomeworldAction extends GameAction {

  constructor() {
    super({
      type: "choose_homeworld",
      undoable: false,
      params: [{
        name: "hexId",
        type: "boardSpace",
        subtype: "hex",
        message: "Select homeworld hex",
        populateChoices: (state: GameState, _playerId: string) => {
          const tw = state as ThroneworldGameState;
          const available: string[] = [];
          for (const [hexId, system] of Object.entries(tw.state.systems)) {
            if (system.worldType === "Homeworld" && !system.details?.owner) {
              available.push(hexId);
            }
          }
          return available.map(h => ({
            id: h,
            displayHint: { hexId: h }
          }));
        }
      }]
    });
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    const tw = state as ThroneworldGameState;
    const hexId = this.params.find(p => p.name === "hexId")?.value;
    if (!hexId) return { action: this, success: false, error: "missing_hexId" };

    const system = tw.state.systems[hexId];
    if (!system || system.worldType !== "Homeworld")
      return { action: this, success: false, error: "invalid_homeworld" };

    if (system.details?.owner)
      return { action: this, success: false, error: "homeworld_taken" };

    this.assignHomeworld(tw, playerId, hexId);

    return { action: this, success: true, message: `Homeworld ${hexId} claimed` };
  }

  private assignHomeworld(state: ThroneworldGameState, playerId: string, hexId: string): void {
    const player = state.players[playerId];
    const system = state.state.systems[hexId];

    if (!player || !system || !player.race) return;

    if (!system.details) {
      system.details = { systemId: hexId, dev: 10, spaceTech: 0, groundTech: 0, spaceUnits: {}, groundUnits: {} };
    }
    system.details.owner = playerId;
    system.revealed = true;

    if (!system.unitsOnPlanet[playerId]) system.unitsOnPlanet[playerId] = [];
    system.unitsOnPlanet[playerId].push(buildUnit("C", playerId), buildUnit("C", playerId));

    if (!system.fleetsInSpace[playerId]) system.fleetsInSpace[playerId] = [];
    system.fleetsInSpace[playerId].push(
      createFleet(buildUnit("Sv", playerId)),
      createFleet(buildUnit("Sv", playerId)),
      createFleet(buildUnit("Sh", playerId))
    );
  }

  // ========== Random Assignment ==========

  static assignRandomly(state: ThroneworldGameState): void {
    const playerIds = shuffle(Object.keys(state.players));
    const hexIds = shuffle(this.getAllAvailableHomeworlds(state));
    playerIds.forEach((playerId, index) => {
      const hexId = hexIds[index];
      if (hexId) this.assignHomeworldStatic(state, playerId, hexId);
    });
  }

  static assignRandomForBot(state: ThroneworldGameState, playerId: string): void {
    const available = this.getAllAvailableHomeworlds(state);
    const hexId = pickRandom(available);
    this.assignHomeworldStatic(state, playerId, hexId);
  }

  private static getAllAvailableHomeworlds(state: ThroneworldGameState): string[] {
    const available: string[] = [];
    for (const [hexId, system] of Object.entries(state.state.systems)) {
      if (system.worldType === "Homeworld" && !system.details?.owner) available.push(hexId);
    }
    return available;
  }

  private static assignHomeworldStatic(state: ThroneworldGameState, playerId: string, hexId: string): void {
    const player = state.players[playerId];
    const system = state.state.systems[hexId];

    if (!player || !system || !player.race) return;

    if (!system.details) {
      system.details = { systemId: hexId, dev: 10, spaceTech: 0, groundTech: 0, spaceUnits: {}, groundUnits: {} };
    }
    system.details.owner = playerId;
    system.revealed = true;

    if (!system.unitsOnPlanet[playerId]) system.unitsOnPlanet[playerId] = [];
    system.unitsOnPlanet[playerId].push(buildUnit("C", playerId), buildUnit("C", playerId));

    if (!system.fleetsInSpace[playerId]) system.fleetsInSpace[playerId] = [];
    system.fleetsInSpace[playerId].push(
      createFleet(buildUnit("Sv", playerId)),
      createFleet(buildUnit("Sv", playerId)),
      createFleet(buildUnit("Sh", playerId))
    );
  }
}

registerAction("choose_homeworld", ChooseHomeworldAction);