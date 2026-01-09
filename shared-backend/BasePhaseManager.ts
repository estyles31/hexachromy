// /shared-backend/BasePhaseManager.ts
import type { IPhaseManager } from "./BackendModuleDefinition";
import { GameAction, type ActionResponse } from "../shared/models/GameAction";
import type { GameDatabaseAdapter } from "../shared/models/GameDatabaseAdapter";
import type { GameState } from "../shared/models/GameState";
import type { LegalActionsResponse } from "../shared/models/ApiContexts";
import { Phase } from "./Phase";

export class BasePhaseManager implements IPhaseManager {
  protected state?: GameState;
  protected gameId!: string;
  db!: GameDatabaseAdapter;
  public phases: Record<string, new () => Phase>;

  constructor(gameId: string, db: GameDatabaseAdapter, phases?: Record<string, new () => Phase>) {
    this.gameId = gameId;
    this.db = db;
    this.phases = phases || { empty: EmptyPhase };
  }

  async reloadGameState(): Promise<GameState> {
    this.state = (await this.db.getDocument(`games/${this.gameId}`)) as GameState;
    return this.state!;
  }

  async getGameState(): Promise<GameState> {
    if (!this.state) {
      this.state = (await this.db.getDocument(`games/${this.gameId}`)) as GameState;
    }
    return this.state!;
  }

  async getCurrentPhase(): Promise<Phase> {
    const state = await this.getGameState();
    const ctor = this.phases[state!.state.currentPhase];
    const phase = ctor ? new ctor() : new EmptyPhase();

    if (phase.loadPhase) {
      await phase.loadPhase({ gameState: state, db: this.db });
    }

    return phase;
  }

  async validateAction(playerId: string, action: GameAction): Promise<{ success: boolean; error?: string }> {
    // Chat is always valid regardless of phase
    if (action.type === "chat") {
      return { success: true };
    }

    const phase = await this.getCurrentPhase();
    return phase.validateAction({ gameState: this.state!, db: this.db }, playerId, action);
  }

  async getLegalActions(playerId: string, filledParams?: Record<string, string>): Promise<LegalActionsResponse> {
    const phase = await this.getCurrentPhase();
    const state = await this.getGameState();

    // Get base legal actions from phase
    const actionsResponse = await phase.getLegalActions({ gameState: state, db: this.db }, playerId);
    let actions = actionsResponse.actions;

    // Apply filled params if provided
    if (filledParams) {
      actions = this.applyFilledParams(actions, filledParams);
    }

    // Populate choices for next unfilled param on each action
    for (const action of actions) {
      action.populateParamChoices(state, playerId);
    }

    // Filter out actions that have no valid choices
    actions = actions.filter((action) => {
      if (action.params.every((p) => p.optional || p.value !== undefined)) return true;

      //this needs to be fixed because we don't collapse choices when one is chosen
      return action.params.some((p) => p.hasValidChoices ?? (p.choices && p.choices.length > 0));
    });

    if (process.env.DEBUG === "true") {
      console.log(`Legal actions for player ${playerId} in phase ${phase.name}:`, JSON.stringify(actions, null, 2));
    }

    return {
      actions,
      message: actionsResponse.message,
    };
  }

  private applyFilledParams(actions: GameAction[], filledParams: Record<string, string>): GameAction[] {
    const survivors: GameAction[] = [];

    for (const action of actions) {
      let valid = true;

      for (const [paramName, value] of Object.entries(filledParams)) {
        const param = action.params.find((p) => p.name === paramName);
        if (!param) {
          valid = false; // Action doesn't have this param
          break;
        }
        param.value = value; // Fill the param
      }

      if (valid) survivors.push(action);
    }

    return survivors;
  }

  async createAction(type: string): Promise<GameAction | null> {
    const phase = await this.getCurrentPhase();
    return phase.createAction(type);
  }

  async postExecuteAction(playerId: string, result: ActionResponse) {
    const phase = await this.getCurrentPhase();
    if (result.action.type === "chat") {
      return result;
    }

    if (phase.onActionCompleted) {
      result = await phase.onActionCompleted({ gameState: this.state!, db: this.db }, playerId, result);
    }

    while (result.phaseTransition) {
      this.state!.state.currentPhase = result.phaseTransition.nextPhase;
      const newPhase = await this.getCurrentPhase();
      if (!newPhase.onPhaseStart) break;

      result = await newPhase.onPhaseStart({ gameState: this.state!, db: this.db });
    }

    return result;
  }
}

export class EmptyPhase extends Phase {
  name = "empty" as const;

  constructor() {
    super();
  }
}
