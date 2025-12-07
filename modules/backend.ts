import type { GameBackendRegistration } from "./types";
import { throneworldBackend } from "./throneworld/functions/throneworldGame";
import { throneworldApi } from "./throneworld/functions/throneworldApi";

export const backendModules: Record<string, GameBackendRegistration> = {
  throneworld: { backend: throneworldBackend, api: throneworldApi },
};
