// /modules/throneworld/functions/phases/GameStartPhase.ts
import { Phase, type PhaseContext } from "./Phase";
import type { LegalActionsResponse, ActionResponse, GameAction } from "../../../../shared/models/ApiContexts";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import { Factions } from "../../shared/models/Factions.ThroneWorld";
import { randomInt } from "crypto";
import { buildUnit } from "../../shared/models/Unit.Throneworld";
import { addUnitToSystem } from "../../shared/models/Systems.ThroneWorld";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";

interface RaceChoiceAction extends GameAction {
  type: "choose_race";
  raceId: string;
}

interface HomeworldChoiceAction extends GameAction {
  type: "choose_homeworld";
  hexId: string;
}

type AssignmentMode = "random" | "playerOrder";

export class GameStartPhase extends Phase {
  readonly name = "GameStart";

  /**
   * Called once when phase starts - handle auto-assignments
   */
  async onPhaseStart(ctx: PhaseContext): Promise<void> {
    const state = ctx.gameState;
    const raceMode = this.getRaceAssignmentMode(state);
    const homeworldMode = this.getHomeworldAssignmentMode(state);

      // Set turn order to start the game
      const playerIds = this.shuffle(Object.keys(state.players));
      state.playerOrder = playerIds;
      state.state.currentPlayer = playerIds[0];

    // If races are random, assign them now
    if (raceMode === "random") {
      this.assignRacesRandomly(state);
    }

    // If homeworlds are random, assign them now
    if (homeworldMode === "random") {
      this.assignHomeworldsRandomly(state);
    }
    // If both are random, assign everything and transition immediately
    if (raceMode === "random" && homeworldMode === "random") {     
      state.state.currentPhase = "Outreach";
      return;
    }

    // If current player is a bot, auto-complete their setup
    const firstPlayer = state.players[state.playerOrder[0]];
    if (firstPlayer.status === "dummy") {
      this.autoCompleteBotSetup(state, state.playerOrder[0]);
      this.advanceToNextPlayer(state);
    }
  }

  protected async getPhaseSpecificActions(ctx: PhaseContext, playerId: string): Promise<LegalActionsResponse> {
    const state = ctx.gameState;
    const player = state.players[playerId];
    
    if (!player) {
      return { actions: [], message: "Player not found" };
    }

    const raceMode = this.getRaceAssignmentMode(state);
    const homeworldMode = this.getHomeworldAssignmentMode(state);
    const actions: GameAction[] = [];

    // Bots don't get actions - they auto-pick
    if (player.status === "dummy") {
      return { actions: [], message: "Bot will choose automatically" };
    }

    // Check if it's this player's turn
    const isPlayersTurn = state.state.currentPlayer === playerId;

    if (!isPlayersTurn) {
      const currentPlayerName = state.players[state.state.currentPlayer || ""]?.displayName || "another player";
      return {
        actions: [],
        message: `Waiting for ${currentPlayerName} to complete setup`,
      };
    }

    // Race selection (if not random and not yet chosen)
    if (raceMode !== "random" && !player.race) {
      const availableRaces = this.getAvailableRaces(state);
      for (const raceId of availableRaces) {
        const faction = Factions[raceId];
        actions.push({
          type: "choose_race",
          raceId,
          undoable: true,
          renderHint: {
            category: "button",
            label: faction.Name,
            description: `Ground: ${faction.StartingTech.Ground}, Space: ${faction.StartingTech.Space}, Jump: ${faction.StartingTech.Jump}, Comm: ${faction.StartingTech.Comm}`,
          },
        });
      }
      return {
        actions,
        message: `Choose your race (${availableRaces.length} available)`,
      };
    }

    // Homeworld selection (if not random and not yet chosen)
    if (homeworldMode !== "random" && !this.playerHasHomeworld(state, playerId)) {
      const availableHomeworlds = this.getAvailableHomeworlds(state);
      for (const hexId of availableHomeworlds) {
        actions.push({
          type: "choose_homeworld",
          hexId,
          undoable: true,
          renderHint: {
            category: "hex-select",
            highlightHexes: availableHomeworlds,
            message: "Click a highlighted hex on the board to choose your homeworld",
          },
        });
      }
      return {
        actions,
        message: `Choose your homeworld (${availableHomeworlds.length} available)`,
      };
    }

    // Player has completed setup
    return {
      actions: [],
      message: "Setup complete. Waiting for other players...",
    };
  }

  protected async executePhaseAction(ctx: PhaseContext, playerId: string, action: GameAction): Promise<ActionResponse> {
    const state = ctx.gameState;

    switch (action.type) {
      case "choose_race":
        return this.handleChooseRace(state, playerId, action as RaceChoiceAction);
      
      case "choose_homeworld":
        return this.handleChooseHomeworld(state, playerId, action as HomeworldChoiceAction);
      
      default:
        return {
          success: false,
          error: `Unknown action type: ${action.type}`,
        };
    }
  }

  private handleChooseRace(state: ThroneworldGameState, playerId: string, action: RaceChoiceAction): ActionResponse {
    const player = state.players[playerId];
    if (!player) {
      return { success: false, error: "Player not found" };
    }

    if (player.race) {
      return { success: false, error: "Race already chosen" };
    }

    if (state.state.currentPlayer !== playerId) {
      return { success: false, error: "Not your turn" };
    }

    const availableRaces = this.getAvailableRaces(state);
    if (!availableRaces.includes(action.raceId)) {
      return { success: false, error: "Race not available" };
    }

    // Assign race and starting tech
    player.race = action.raceId;
    const faction = Factions[action.raceId];
    player.tech = { ...faction.StartingTech };

    // Don't advance turn yet - player still needs to pick homeworld (if not random)

    return {
      success: true,
      stateChanges: state,
      undoAction: {
        type: "unchoose_race",
        playerId,
        undoable: false,
      },
    };
  }

  private handleChooseHomeworld(state: ThroneworldGameState, playerId: string, action: HomeworldChoiceAction): ActionResponse {
    const player = state.players[playerId];
    if (!player) {
      return { success: false, error: "Player not found" };
    }

    if (!player.race) {
      return { success: false, error: "Must choose race first" };
    }

    if (this.playerHasHomeworld(state, playerId)) {
      return { success: false, error: "Homeworld already chosen" };
    }

    if (state.state.currentPlayer !== playerId) {
      return { success: false, error: "Not your turn" };
    }

    const availableHomeworlds = this.getAvailableHomeworlds(state);
    if (!availableHomeworlds.includes(action.hexId)) {
      return { success: false, error: "Homeworld not available" };
    }

    // Assign homeworld and give starting units
    this.assignHomeworldToPlayer(state, playerId, action.hexId);

    // Advance turn now that player has completed both choices
    this.advanceToNextPlayer(state);

    // Check if all players have completed setup → transition to Outreach
    if (this.allPlayersComplete(state)) {
      state.state.currentPhase = "Outreach";
      return {
        success: true,
        stateChanges: state,
        message: "All players ready! Starting Outreach phase.",
      };
    }

    return {
      success: true,
      stateChanges: state,
      undoAction: {
        type: "unchoose_homeworld",
        playerId,
        hexId: action.hexId,
        undoable: false,
      },
    };
  }

  // ========== Helper Methods ==========

  private getRaceAssignmentMode(state: ThroneworldGameState): AssignmentMode {
    return (state.options.raceAssignment as AssignmentMode) || "random";
  }

  private getHomeworldAssignmentMode(state: ThroneworldGameState): AssignmentMode {
    return (state.options.homeworldAssignment as AssignmentMode) || "random";
  }

  private advanceToNextPlayer(state: ThroneworldGameState): void {
    const order = state.playerOrder || [];
    const currentIndex = order.indexOf(state.state.currentPlayer || "");
    
    if (currentIndex === -1) return;

    // Find next player who hasn't completed setup
    for (let i = currentIndex + 1; i < order.length; i++) {
      const nextPlayerId = order[i];
      const nextPlayer = state.players[nextPlayerId];
      
      if (!nextPlayer.race || !this.playerHasHomeworld(state, nextPlayerId)) {
        state.state.currentPlayer = nextPlayerId;
        
        // Auto-handle bot
        if (nextPlayer.status === "dummy") {
          this.autoCompleteBotSetup(state, nextPlayerId);
          this.advanceToNextPlayer(state); // Continue to next
        }
        return;
      }
    }
    
    // All players complete - reset to first player for next phase
    state.state.currentPlayer = order[0];
  }

  private autoCompleteBotSetup(state: ThroneworldGameState, botId: string): void {
    const bot = state.players[botId];
    if (!bot || bot.status !== "dummy") return;

    // Auto-pick race if needed
    if (!bot.race) {
      const availableRaces = this.getAvailableRaces(state);
      if (availableRaces.length > 0) {
        const raceId = availableRaces[randomInt(availableRaces.length)];
        bot.race = raceId;
        
        const faction = Factions[raceId];
        bot.tech = { ...faction.StartingTech };
      }
    }

    // Auto-pick homeworld if needed
    if (bot.race && !this.playerHasHomeworld(state, botId)) {
      const availableHomeworlds = this.getAvailableHomeworlds(state);
      if (availableHomeworlds.length > 0) {
        const randomHex = availableHomeworlds[randomInt(availableHomeworlds.length)];
        this.assignHomeworldToPlayer(state, botId, randomHex);
      }
    }
  }

  private allPlayersComplete(state: ThroneworldGameState): boolean {
    for (const player of Object.values(state.players)) {
      if (!player.race) return false;
      if (!this.playerHasHomeworld(state, player.uid)) return false;
    }
    return true;
  }

  private assignRacesRandomly(state: ThroneworldGameState): void {
    const playerIds = Object.keys(state.players);
    const availableRaces = this.shuffle(Object.keys(Factions));
    
    playerIds.forEach((playerId, index) => {
      const raceId = availableRaces[index];
      const player = state.players[playerId];
      player.race = raceId;
      
      // Set starting tech
      const faction = Factions[raceId];
      player.tech = { ...faction.StartingTech };
    });
  }

  private assignHomeworldsRandomly(state: ThroneworldGameState): void {
    const playerIds = this.shuffle(Object.keys(state.players));
    const availableHomeworlds = this.getAvailableHomeworlds(state);
    
    playerIds.forEach((playerId, index) => {
      const hexId = availableHomeworlds[index];
      if (hexId) {
        this.assignHomeworldToPlayer(state, playerId, hexId);
      }
    });
  }

  private assignHomeworldToPlayer(state: ThroneworldGameState, playerId: string, hexId: string): void {
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
      spaceUnits: {
        Sh: 1,  // 1 Shield
        Sv: 2,  // 2 Survey Teams
      },
      groundUnits: player.race === "Q" ? { qC: 2 } : { C: 2 },
    };

    const bunkerId = player.race === "Q" ? "qC" : "C";

    console.log(JSON.stringify(UNITS));

    //build 2 Command Bunkers, 2 Survey Teams, and a Shield
    addUnitToSystem(system, buildUnit(bunkerId, playerId));
    addUnitToSystem(system, buildUnit(bunkerId, playerId));
    addUnitToSystem(system, buildUnit("St", playerId));
    addUnitToSystem(system, buildUnit("St", playerId));
    addUnitToSystem(system, buildUnit("Sh", playerId));
    system.revealed = true;
    system.scannedBy = [playerId];
    player.resources = hwProduction;
  }

  private getAvailableRaces(state: ThroneworldGameState): string[] {
    const assignedRaces = Object.values(state.players)
      .map(p => p.race)
      .filter(Boolean) as string[];
    
    return Object.keys(Factions).filter(id => !assignedRaces.includes(id));
  }

  private getAvailableHomeworlds(state: ThroneworldGameState): string[] {
    const systems = state.state.systems;
    const availableHexes: string[] = [];

    for (const [hexId, system] of Object.entries(systems)) {
      if (system.worldType === "Homeworld" && !system.details?.owner) {
        availableHexes.push(hexId);
      }
    }

    return availableHexes;
  }

  private playerHasHomeworld(state: ThroneworldGameState, playerId: string): boolean {
    const systems = state.state.systems;
    
    for (const system of Object.values(systems)) {
      if (system.worldType === "Homeworld" && system.details?.owner === playerId) {
        return true;
      }
    }
    
    return false;
  }

  private shuffle<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async getMessageEnvelope(ctx: PhaseContext, playerId: string): Promise<string> {
    const state = ctx.gameState;
    const player = state.players[playerId];
    
    if (!player) return "Setting up game...";
    if (!player.race) return "Choose your race";
    if (!this.playerHasHomeworld(state, playerId)) return "Choose your homeworld";
    return "Waiting for other players...";
  }
}
