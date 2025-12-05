import { frontendModules } from "@game-modules";
import type { FrontendModuleDefinition } from "./types";

export function getFrontendModule(gameType: string): FrontendModuleDefinition | undefined {
  return frontendModules[gameType];
}
