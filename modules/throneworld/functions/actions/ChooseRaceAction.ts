// /modules/throneworld/functions/actions/ChooseRaceAction.ts
import { ActionResponse, GameAction } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { Factions } from "../../shared/models/Factions.ThroneWorld";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import { pickRandom, shuffle } from "../../../../shared/utils/RandomUtils";

export class ChooseRaceAction extends GameAction {
  constructor() {
    super({
      type: "choose_race",
      undoable: false,
      params: [{
        name: "raceId",
        type: "choice",
        message: "Select race",
        populateChoices: (state: GameState, _playerId: string) => {
          const tw = state as ThroneworldGameState;
          const assigned = Object.values(tw.players).map(p => p.race).filter(Boolean);
          const available = Object.keys(Factions).filter(raceId => !assigned.includes(raceId));
          
          return available.map(raceId => ({
            id: raceId,
            label: Factions[raceId].Name,
            metadata: { faction: raceId }
          }));
        }
      }]
    });
  }

  async execute(state: GameState, playerId: string): Promise<ActionResponse> {
    const tw = state as ThroneworldGameState;
    const raceId = this.params.find(p => p.name === "raceId")?.value;
    if (!raceId) return { action: this, success: false, error: "missing_raceId" };

    const assigned = Object.values(tw.players).map(p => p.race).filter(Boolean);
    const available = Object.keys(Factions).filter(r => !assigned.includes(r));
    if (!available.includes(raceId))
      return { action: this, success: false, error: "race_unavailable" };

    const player = tw.players[playerId];
    const faction = Factions[raceId];
    player.race = raceId;
    player.tech = { ...faction.StartingTech };

    return { action: this, success: true, message: `${Factions[raceId].Name} selected` };
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