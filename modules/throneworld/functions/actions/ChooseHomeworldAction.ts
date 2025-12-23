// /modules/throneworld/functions/actions/ChooseHomeworldAction.ts
import { ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import { buildUnit } from "../../shared/models/Unit.Throneworld";
import { addUnitToSystem } from "../../shared/models/Systems.ThroneWorld";
import { ParamChoicesResponse } from "../../../../shared/models/ActionParams";
import { Factions } from "../../shared/models/Factions.ThroneWorld";

export class ChooseHomeworldAction extends GameAction {

  constructor() {
    super({
      type: "choose_homeworld",
      undoable: false,
      params: [{
        name: "hexId",
        type: "boardSpace",
        subtype: "hex",
        message: "Select homeworld hex"
      }]
    });
  }

  getParamChoices(
    state: GameState,
    playerId: string,
    paramName: string
  ): ParamChoicesResponse {

    if (paramName !== "hexId")
      return { choices: [], error: "unknown_param" };

    const tw = state as ThroneworldGameState;
    const available: string[] = [];

    for (const [hexId, system] of Object.entries(tw.state.systems)) {
      if (system.worldType === "Homeworld" && !system.details?.owner)
        available.push(hexId);
    }

    return {
      choices: available.map(h => ({
        id: h,
        type: "boardSpace",
        subtype: "hex",
        displayHint: { hexId: h }
      })),
      message: `Select homeworld (${available.length} available)`
    };
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    const tw = state as ThroneworldGameState;

    const hexId = this.params.find(p => p.name === "hexId")?.value;
    if (!hexId) return { action: this, success: false, error: "missing_hexId" };

    const system = tw.state.systems[hexId];
    if (!system || system.worldType !== "Homeworld")
      return { action: this, success: false, error: "invalid_homeworld" };

    if (system.details?.owner)
      return { action: this, success: false, error: "home_owned" };

    const race = tw.players[playerId].race;
    if (!race) return { action: this, success: false, error: "pick_race_first" };

    assignHomeworldToPlayer(tw, playerId, hexId);

    return {
      action: this,
      success: true,
      message: `Homeworld selected: ${hexId}`
    };
  }
}


export function assignHomeworldToPlayer(state: ThroneworldGameState, playerId: string, hexId: string): void {
  const player = state.players[playerId];
  const system = state.state.systems[hexId];

  if (!player || !system || !player.race) return;

  const faction = Factions[player.race];
  const hwProduction = 10 + (faction.ProductionBonus?.Homeworld || 0);

  system.details = {
    systemId: `homeworld-${playerId}`,
    owner: playerId,
    dev: hwProduction,
    spaceTech: 0,
    groundTech: 0,
    spaceUnits: {},
    groundUnits: {},
  };

  const bunkerId = player.race === "Q" ? "qC" : "C";

  // Build 2 Command Bunkers, 2 Survey Teams, and a Shield
  addUnitToSystem(system, buildUnit(bunkerId, playerId));
  addUnitToSystem(system, buildUnit(bunkerId, playerId));
  addUnitToSystem(system, buildUnit("Sv", playerId));
  addUnitToSystem(system, buildUnit("Sv", playerId));
  addUnitToSystem(system, buildUnit("Sh", playerId));

  system.revealed = true;
  system.scannedBy = [playerId];
  player.resources = hwProduction;
}


registerAction("choose_homeworld", ChooseHomeworldAction);