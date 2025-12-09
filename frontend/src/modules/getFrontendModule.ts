import type { FrontendModuleDefinition } from "../../../modules/FrontendModuleDefinition";
import { frontendModules } from "../../../modules/frontend";


export function getFrontendModule(gameType: string): FrontendModuleDefinition<any> | undefined {
  return frontendModules[gameType];
}
