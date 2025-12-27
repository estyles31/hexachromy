// /modules/throneworld/functions/phases/GameStartPhase.ts
import { Phase, PhaseContext } from "../../../../shared-backend/Phase";
import type { LegalActionsResponse } from "../../../../shared/models/ApiContexts";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { ChooseRaceAction } from "../actions/ChooseRaceAction";
import { ChooseHomeworldAction } from "../actions/ChooseHomeworldAction";
import { ActionResponse, SystemAction } from "../../../../shared/models/GameAction";
import { shuffle } from "../../../../shared/utils/RandomUtils";

export class GameStartPhase extends Phase {
  readonly name = "GameStart";

  async loadPhase(ctx: PhaseContext): Promise<void> {
    const state = ctx.gameState as ThroneworldGameState;

    // Set currentPlayers based on who needs to make choices
    const nextPlayer = this.findNextUnfinishedPlayer(state);
    state.state.currentPlayers = nextPlayer ? [nextPlayer] : undefined;
  }

  async onPhaseStart(ctx: PhaseContext): Promise<ActionResponse> {
    const state = ctx.gameState as ThroneworldGameState;

    // Set player order if not set
    if (!state.playerOrder || state.playerOrder.length === 0) {
      state.playerOrder = shuffle(Object.keys(state.players));
    }

    const raceMode = (state.options.raceAssignment as string) || "random";
    const homeworldMode = (state.options.homeworldAssignment as string) || "random";

    // Random assignments (only if not already done)
    const allPlayersHaveRaces = Object.values(state.players).every(p => p.race);
    const allPlayersHaveHomeworlds = Object.values(state.players).every(p => {
      const playerId = Object.keys(state.players).find(id => state.players[id] === p)!;
      return this.playerHasHomeworld(state, playerId);
    });

    if (raceMode === "random" && !allPlayersHaveRaces) {
      ChooseRaceAction.assignRandomly(state);
    }
    if (homeworldMode === "random" && !allPlayersHaveHomeworlds) {
      ChooseHomeworldAction.assignRandomly(state);
    }

    const result: ActionResponse = {
      action: new SystemAction(),
      success: true,
      message: "Game started." 
        + (raceMode === "random" ? " Races assigned randomly." : "") 
        + (homeworldMode === "random" ? " Homeworlds assigned randomly." : ""),
      undoable: false,
    };

    // Check again after potential assignments
    const nowAllHaveRaces = Object.values(state.players).every(p => p.race);
    const nowAllHaveHomeworlds = Object.values(state.players).every(p => {
      const playerId = Object.keys(state.players).find(id => state.players[id] === p)!;
      return this.playerHasHomeworld(state, playerId);
    });

    // If everyone has everything, skip directly to Outreach
    if (nowAllHaveRaces && nowAllHaveHomeworlds) {
      result.phaseTransition = { nextPhase: "Outreach", transitionType: "nextPhase" };
    } else {
      // Set current player to first who needs setup
      const nextPlayer = this.findNextUnfinishedPlayer(state);
      state.state.currentPlayers = nextPlayer ? [nextPlayer] : undefined;
    }
    
    return result;
  }

  protected async getPhaseSpecificActions(
    ctx: PhaseContext,
    playerId: string
  ): Promise<LegalActionsResponse> {
    const state = ctx.gameState as ThroneworldGameState;
    const player = state.players[playerId];

    if (!player || !this.isItMyTurn(ctx, playerId)) {
      return { actions: [], message: "Waiting for other players..." };
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

    return { actions: [], message: "Waiting for other players..." };
  }

  async onActionCompleted(
    ctx: PhaseContext,
    playerId: string,
    result: ActionResponse
  ): Promise<ActionResponse> {
    if (!result.success) return result;

    const state = ctx.gameState as ThroneworldGameState;

    // Process bots until we hit a human or finish setup
    let next = this.findNextUnfinishedPlayer(state);

    while (next) {
      state.state.currentPlayers = [next];

      // If human, stop here and wait for their action
      if (!state.players[next].uid.startsWith("bot")) {
        return result;
      }

      // Bot: auto-play required setup actions
      this.runBotSetupActions(state, next);
      next = this.findNextUnfinishedPlayer(state);
    }

    // No more players need setup - advance to Outreach
    state.state.currentPlayers = undefined;
    result.phaseTransition = {
      nextPhase: "Outreach",
      transitionType: "nextPhase",
    };
    return result;
  }

  private runBotSetupActions(state: ThroneworldGameState, playerId: string): void {
    const raceMode = state.options.raceAssignment || "random";
    const homeworldMode = state.options.homeworldAssignment || "random";

    if (raceMode !== "random" && !state.players[playerId].race) {
      ChooseRaceAction.assignRandomForBot(state, playerId);
    }

    if (homeworldMode !== "random" && !this.playerHasHomeworld(state, playerId)) {
      ChooseHomeworldAction.assignRandomForBot(state, playerId);
    }
  }

  private playerHasHomeworld(state: ThroneworldGameState, playerId: string): boolean {
    for (const system of Object.values(state.state.systems)) {
      if (system.worldType === "Homeworld" && system.details?.owner === playerId) {
        return true;
      }
    }
    return false;
  }

  private findNextUnfinishedPlayer(
    state: ThroneworldGameState,
  ): string | null {
    const raceMode = state.options.raceAssignment || "random";
    const homeworldMode = state.options.homeworldAssignment || "random";

    const needsSetup = (pid: string) => {
      const player = state.players[pid];
      if (raceMode !== "random" && !player.race) return true;
      if (homeworldMode !== "random" && !this.playerHasHomeworld(state, pid)) return true;
      return false;
    };

    const order = state.playerOrder;

    for (let i = 0; i < order.length; i++) {
      const pid = order[i];
      if (needsSetup(pid)) return pid;
    }

    return null;
  }
}