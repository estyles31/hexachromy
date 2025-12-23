import type { FrontendModuleDefinition } from "../../../shared-frontend/FrontendModuleDefinition";
import { frontendModules } from "../../../shared-frontend/frontend";

export function getFrontendModule(gameType: string): FrontendModuleDefinition<any> | undefined {
  return frontendModules[gameType];
}