import type { FrontendModuleDefinition } from "../frontend/src/modules/types";
import frontend from "./throneworld/frontend";

export const frontendModules: Record<string, FrontendModuleDefinition> = {
  throneworld: frontend,
};
