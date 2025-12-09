import type { GameDefinition } from "../shared/models/GameDefinition";
import type { GameStartContext, GetPlayerViewContext } from "./types";

export interface BackendModuleDefinition {
  id: string;

  getGameDefinition(): GameDefinition;
  
  createGame(ctx: GameStartContext): Promise<unknown>;
  getPlayerView(ctx: GetPlayerViewContext) : Promise<unknown>;
}
