import { throneworldBackend } from "./throneworld/functions/throneworldGame";
import type { BackendModuleDefinition } from "./BackendModuleDefinition";

export const backendModules: Record<string, BackendModuleDefinition> = {
  throneworld: throneworldBackend,
};
