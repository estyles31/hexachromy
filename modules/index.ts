import type { GameModuleManifest } from "./types";
import throneworld from "./throneworld/module";

export const gameModules: Record<string, GameModuleManifest> = {
  throneworld
};
