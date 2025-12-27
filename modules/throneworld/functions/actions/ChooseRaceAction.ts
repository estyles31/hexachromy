// /modules/throneworld/functions/actions/ChooseRaceAction.ts
import { ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { Factions } from "../../shared/models/Factions.ThroneWorld";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import { ParamChoicesResponse, ParamType } from "../../../../shared/models/ActionParams";
import { pickRandom, shuffle } from "../../../../shared/utils/RandomUtils";

export class ChooseRaceAction extends GameAction {
  constructor() {
    super({
      type: "choose_race",
      undoable: false,
      params: [{
        name: "raceId",
        type: "choice",
        message: "Select race"
      }]
    });
  }

  getParamChoices(
    state: GameState,
    playerId: string,
    paramName: string
  ): ParamChoicesResponse {

    if (paramName !== "raceId")
      return { choices: [], error: "unknown_param" };

    const tw = state as ThroneworldGameState;
    const available = this.getAvailableRaces(tw);

    return {
      choices: available.map(raceId => ({
        id: raceId,
        type: "choice" as ParamType,
        label: Factions[raceId].Name,
        metadata: { faction: raceId }
      })),
      message: `Pick race (${available.length} available)`
    };
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    const tw = state as ThroneworldGameState;

    const raceId = this.params.find(p => p.name === "raceId")?.value;
    if (!raceId) return { action: this, success: false, error: "missing_raceId" };

    const available = this.getAvailableRaces(tw);
    if (!available.includes(raceId))
      return { action: this, success: false, error: "race_unavailable" };

    this.assignRace(tw, playerId, raceId);

    return {
      action: this,
      success: true,
      message: `${Factions[raceId].Name} selected`
    };
  }

  private getAvailableRaces(state: ThroneworldGameState): string[] {
    const assigned = Object.values(state.players).map(p => p.race).filter(Boolean);
    return Object.keys(Factions).filter(raceId => !assigned.includes(raceId));
  }

  private assignRace(state: ThroneworldGameState, playerId: string, raceId: string): void {
    const player = state.players[playerId];
    const faction = Factions[raceId];
    player.race = raceId;
    player.tech = { ...faction.StartingTech };
  }

  // ========== Random Assignment ==========

  static assignRandomly(state: ThroneworldGameState): void {
    const playerIds = Object.keys(state.players);
    const races = shuffle(Object.keys(Factions));
    
    playerIds.forEach((playerId, index) => {
      const player = state.players[playerId];
      const raceId = races[index];
      player.race = raceId;
      player.tech = { ...Factions[raceId].StartingTech };
    });
  }

  static assignRandomForBot(state: ThroneworldGameState, playerId: string): void {
    const assigned = Object.values(state.players).map(p => p.race).filter(Boolean);
    const available = Object.keys(Factions).filter(r => !assigned.includes(r));
    
    const raceId = pickRandom(available);
    const player = state.players[playerId];
    player.race = raceId;
    player.tech = { ...Factions[raceId].StartingTech };
  }
}

registerAction("choose_race", ChooseRaceAction);