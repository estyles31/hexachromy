import { gameModules } from "@game-modules";
import type { FrontendModuleDefinition } from "./types";

export function getFrontendModule(gameType: string): FrontendModuleDefinition | undefined {
  const moduleEntry = gameModules[gameType];
  return moduleEntry?.frontend as FrontendModuleDefinition | undefined;
}
