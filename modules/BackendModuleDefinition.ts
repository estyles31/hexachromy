import type { GameDefinition } from "../shared/models/GameDefinition";
import type { GetPlayerViewContext } from "./types";
import type { GameStartContext } from "../shared/models/GameStartContext";

export interface BackendModuleDefinition {
  id: string;

  getGameDefinition(): GameDefinition;
  
  createGame(ctx: GameStartContext): Promise<unknown>;
  getPlayerView(ctx: GetPlayerViewContext) : Promise<unknown>;
}
