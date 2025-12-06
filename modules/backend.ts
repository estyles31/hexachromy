import type { GameBackendModule } from "./types";
import { throneworldBackend } from "./throneworld/functions/throneworldGame";

export const backendModules: Record<string, { backend: GameBackendModule }> = {
  throneworld: { backend: throneworldBackend },
};
