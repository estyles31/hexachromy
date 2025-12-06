import type { GameModuleManifest } from "./types";

/**
 * Pure metadata about available modules.
 * Frontend and backend layers should import their own entry points directly
 * from /modules/{game}/frontend or /modules/{game}/functions.
 */
export const gameModules: Record<string, GameModuleManifest> = {
  throneworld: {
    id: "throneworld",
    frontendEntry: "./throneworld/frontend/index.ts",
    backendEntry: "./throneworld/functions/throneworldGame.ts",
  },
};
