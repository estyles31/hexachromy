// /modules/throneworld/functions/actions/ChooseRaceAction.ts
import { ActionResponse, GameAction, StateDelta } from "../../../../shared/models/GameAction";
import type { GameState } from "../../../../shared/models/GameState";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { Factions } from "../../shared/models/Factions.ThroneWorld";
import { registerAction } from "../../../../shared-backend/ActionRegistry";
import { ParamChoicesResponse, ParamType } from "../../../../shared/models/ActionParams";

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

        const assigned = Object.values(tw.players)
            .map(p => p.race)
            .filter(Boolean);

        const choices = Object.keys(Factions)
            .filter(raceId => !assigned.includes(raceId))
            .map(raceId => ({
                id: raceId,
                type: "choice" as ParamType,
                label: Factions[raceId].Name,
                metadata: {
                    faction: raceId,
                }
            }));

        return {
            choices,
            message: `Pick race (${choices.length} available)`
        };
    }

    async execute(state: GameState, playerId: string): Promise<ActionResponse> {
        const tw = state as ThroneworldGameState;

        const raceId = this.params.find(p => p.name === "raceId")?.value;
        if (!raceId) return { action: this, success: false, error: "missing_raceId" };

        // verify legal
        const available = Object.keys(Factions)
            .filter(r => !Object.values(tw.players).some(p => p.race === r));

        if (!available.includes(raceId))
            return { action: this, success: false, error: "race_unavailable" };

        const deltas: StateDelta[] = [];

        // assign race
        deltas.push({
            path: `players.${playerId}.race`,
            oldValue: undefined,
            newValue: raceId,
            visibility: "public"
        });

        // assign starting tech
        deltas.push({
            path: `players.${playerId}.tech`,
            oldValue: tw.players[playerId].tech,
            newValue: { ...Factions[raceId].StartingTech },
            visibility: "public"
        });

        return {
            action: this,
            success: true,
            stateChanges: deltas,
            message: `Race ${raceId} selected`
        };
    }
}

registerAction("choose_race", ChooseRaceAction);
