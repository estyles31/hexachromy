import type { GameDefinition } from "../shared/models/GameDefinition";
import type { GetPlayerViewContext, GameStartContext, ActionContext, ActionResponse, LegalActionsContext, 
              LegalActionsResponse, UndoResponse, UndoContext } from "../shared/models/ApiContexts";

export interface BackendModuleDefinition {
  id: string;
  
  getGameDefinition(): GameDefinition;
  
  createGame(ctx: GameStartContext): Promise<unknown>;
  getPlayerView?(ctx: GetPlayerViewContext): Promise<{ playerView: unknown } | null>;
  getLegalActions?(ctx: LegalActionsContext): Promise<LegalActionsResponse>;
  handleAction?(ctx: ActionContext): Promise<ActionResponse>;
  undoAction?(ctx: UndoContext): Promise<UndoResponse>;
}
