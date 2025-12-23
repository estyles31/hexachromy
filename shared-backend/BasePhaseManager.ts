import type { IPhaseManager } from "./BackendModuleDefinition";
import { GameAction, type ActionResponse } from "../shared/models/GameAction";
import type { GameDatabaseAdapter } from "../shared/models/GameDatabaseAdapter";
import type { GameState } from "../shared/models/GameState";
import { Phase } from "./Phase";
import { applyDeltasToDatabase } from "../functions/src/actions/ActionHandler";

export class BasePhaseManager implements IPhaseManager {
  constructor(gameId: string, db: GameDatabaseAdapter, phases?: Record<string, new () => Phase>) {
    this.gameId = gameId;
    this.db = db;
    this.phases = phases || { "empty": EmptyPhase };
  }

  protected state?: GameState;
  protected gameId!: string;
  protected db!: GameDatabaseAdapter;
  public phases: Record<string, new () => Phase>;

  async reloadGameState(): Promise<GameState> {
    this.state = await this.db.getDocument(`games/${this.gameId}`) as GameState;
    return this.state!;
  }

  async getGameState(): Promise<GameState> {
    if (!this.state) {
      this.state = await this.db.getDocument(`games/${this.gameId}`) as GameState;
    }
    return this.state!;
  }

  async startPhase(): Promise<void> {
    const phase = await this.getCurrentPhase();

    if (!phase.onPhaseStart) return;

    const state = await this.getGameState();
    const deltas = await phase.onPhaseStart({ gameState: state, db: this.db });

    if (deltas.length > 0) {
      await applyDeltasToDatabase(this.gameId, state.version, deltas);
      await this.reloadGameState();
    }
  }

  async getCurrentPhase(): Promise<Phase> {
    const state = await this.getGameState();
    const ctor = this.phases[state!.state.currentPhase];
    return ctor ? new ctor() : new EmptyPhase();
  }

  async validateAction(playerId: string, action: GameAction): Promise<{ success: boolean; error?: string }> {
    const phase = await this.getCurrentPhase();
    return phase.validateAction({ gameState: this.state!, db: this.db }, playerId, action);
  }

  async getLegalActions(playerId: string) {
    const phase = await this.getCurrentPhase();
    return phase.getLegalActions({ gameState: this.state!, db: this.db }, playerId);
  }

  async getParamChoices(playerId: string, actionType: string, paramName: string, filledParams: Record<string, string>) {
    const state = await this.getGameState();
    const phase = await this.getCurrentPhase();
    return phase.getParamChoices(
      { gameState: state, db: this.db },
      playerId,
      actionType,
      paramName,
      filledParams
    );
  }

  async createAction(type: string): Promise<GameAction | null> {
    const phase = await this.getCurrentPhase();
    return phase.createAction(type);
  }

  async postExecuteAction(playerId: string, result: ActionResponse) {
    const phase = await this.getCurrentPhase();

    if (!phase.onActionCompleted)
      return [];

    return await phase.onActionCompleted(
      { gameState: this.state!, db: this.db },
      playerId,
      result
    );
  }
}

export class EmptyPhase extends Phase {
  name!: "empty";

  constructor() {
    super();
  }
}