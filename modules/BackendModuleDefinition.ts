// /modules/BackendModuleDefinition.ts
import type { GameDefinition } from "../shared/models/GameDefinition";
import type { 
  GetPlayerViewContext, 
  GameStartContext, 
  ActionContext, 
  ActionResponse, 
  LegalActionsContext, 
  LegalActionsResponse, 
  UndoResponse, 
  UndoContext,
  ParameterValuesContext, 
  ParameterValuesResponse
} from "../shared/models/ApiContexts";
import type { ParamChoicesResponse } from "../shared/models/ActionParams";
import type { GameDatabaseAdapter } from "../shared/models/GameDatabaseAdapter";

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
  getLegalActions?(ctx: LegalActionsContext): Promise<LegalActionsResponse>;
  handleAction?(ctx: ActionContext): Promise<ActionResponse>;
  undoAction?(ctx: UndoContext): Promise<UndoResponse>;
  
  /** @deprecated Use getParamChoices instead */
  getParameterValues?(ctx: ParameterValuesContext): Promise<ParameterValuesResponse>;
  
  /** Get legal choices for an action parameter */
  getParamChoices?(ctx: ParamChoicesContext): Promise<ParamChoicesResponse>;
}
