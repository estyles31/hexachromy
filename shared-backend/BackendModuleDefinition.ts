// /modules/BackendModuleDefinition.ts
import type { GameDefinition } from "../shared/models/GameDefinition";
import type { 
  GetPlayerViewContext, 
  GameStartContext, 
  LegalActionsResponse,
} from "../shared/models/ApiContexts";
import type { ParamChoicesResponse } from "../shared/models/ActionParams";
import type { GameDatabaseAdapter } from "../shared/models/GameDatabaseAdapter";
import type { GameAction, ActionResponse, StateDelta } from "../shared/models/GameAction";
import type { GameState } from "../shared/models/GameState";
import type { Phase } from "./Phase";

export interface IPhaseManager {

  /** Must hold state in memory */
  getGameState(): Promise<GameState>;
  reloadGameState(): Promise<GameState>;
  
  getCurrentPhase(): Promise<Phase>;

  validateAction(
    playerId: string,
    action: GameAction
  ): Promise<{ success: boolean; error?: string }>;

  postExecuteAction(
    playerId: string,
    result: ActionResponse
  ): Promise<StateDelta[]>;

  getLegalActions?(
    playerId: string
  ): Promise<LegalActionsResponse>;

  createAction(type: string): Promise<GameAction | null>;

  getParamChoices?(
    playerId: string,
    actionType: string,
    paramName: string,
    filledParams: Record<string, string>
  ): Promise<ParamChoicesResponse>;
}

export interface ParamChoicesContext {
  gameId: string;
  playerId: string;
  actionType: string;
  paramName: string;
  filledParams: Record<string, string>;
  db: GameDatabaseAdapter;
}

export interface BackendModuleDefinition {
  id: string;
  
  getGameDefinition(): GameDefinition;
  
  createGame(ctx: GameStartContext): Promise<unknown>;
  getPlayerView?(ctx: GetPlayerViewContext): Promise<{ playerView: unknown } | null>;
  
  getPhaseManager(gameId: string, db: GameDatabaseAdapter): IPhaseManager;
}
