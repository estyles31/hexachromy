// /frontend/src/modules/frontend.ts
import { ThroneworldFrontendModule } from "./throneworld/frontend/ThroneWorldFrontendModule";
import type { FrontendModuleDefinition } from "./FrontendModuleDefinition";

export const frontendModules: Record<string, FrontendModuleDefinition<any, any>> = {
  throneworld: ThroneworldFrontendModule,
};
