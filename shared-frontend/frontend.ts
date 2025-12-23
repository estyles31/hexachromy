// /frontend/src/modules/frontend.ts
import { ThroneworldFrontendModule } from "../modules/throneworld/frontend/ThroneWorldFrontendModule";
import type { FrontendModuleDefinition } from "../shared-frontend/FrontendModuleDefinition";

export const frontendModules: Record<string, FrontendModuleDefinition<any, any>> = {
  throneworld: ThroneworldFrontendModule,
};
