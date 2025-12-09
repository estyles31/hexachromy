import type { GameDefinition } from "../shared/models/GameDefinition";
import type { GetPlayerViewContext } from "../shared/models/GetPlayerViewContext";
import type { GameStartContext } from "../shared/models/GameStartContext";

export interface BackendModuleDefinition {
  id: string;

  getGameDefinition(): GameDefinition;
  
  createGame(ctx: GameStartContext): Promise<unknown>;
  getPlayerView(ctx: GetPlayerViewContext) : Promise<unknown>;
}
