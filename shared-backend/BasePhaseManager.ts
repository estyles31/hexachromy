import type { IPhaseManager } from "./BackendModuleDefinition";
import { GameAction, type ActionResponse } from "../shared/models/GameAction";
import type { GameDatabaseAdapter } from "../shared/models/GameDatabaseAdapter";
import type { GameState } from "../shared/models/GameState";
import { Phase } from "./Phase";

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

  async getCurrentPhase(): Promise<Phase> {
    const state = await this.getGameState();
    const ctor = this.phases[state!.state.currentPhase];
    const phase = ctor ? new ctor() : new EmptyPhase();
    
    // Load/initialize phase state
    if (phase.loadPhase) {
      await phase.loadPhase({ gameState: state, db: this.db });
    }
    
    return phase;
  }

  async validateAction(playerId: string, action: GameAction): Promise<{ success: boolean; error?: string }> {
    const phase = await this.getCurrentPhase();
    return phase.validateAction({ gameState: this.state!, db: this.db }, playerId, action);
  }

  async getLegalActions(playerId: string) {
    const phase = await this.getCurrentPhase();
    const actions = phase.getLegalActions({ gameState: this.state!, db: this.db }, playerId);
    if(process.env.DEBUG === "true") {
      console.log(`Legal actions for player ${playerId} in phase ${phase.name}: ${JSON.stringify(actions)}`);
    }
    return actions;
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
      result = await phase.onActionCompleted(
        { gameState: this.state!, db: this.db },
        playerId,
        result
      );
    }

    while(result.phaseTransition) {
      this.state!.state.currentPhase = result.phaseTransition.nextPhase;
      const newPhase = await this.getCurrentPhase();
      if(!newPhase.onPhaseStart) break;
        
      result = await newPhase.onPhaseStart({ gameState: this.state!, db: this.db });
    }

    return result;
  }
}

export class EmptyPhase extends Phase {
  name!: "empty";

  constructor() {
    super();
  }
}