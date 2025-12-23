import { throneworldBackend } from "../modules/throneworld/functions/throneworldGame";
import { GameDatabaseAdapter } from "../shared/models/GameDatabaseAdapter";
import { GameState } from "../shared/models/GameState";
import type { BackendModuleDefinition } from "./BackendModuleDefinition";

export const backendModules: Record<string, BackendModuleDefinition> = {
  throneworld: throneworldBackend,
};

export async function getBackendModule(gameId: string, dbAdapter: GameDatabaseAdapter): Promise<BackendModuleDefinition | undefined> {
      // Load game state to get game type
      const gameState = await dbAdapter.getDocument(`games/${gameId}`) as GameState;
      if (!gameState) {
        return undefined;
      }
      return backendModules[gameState.gameType];
}
