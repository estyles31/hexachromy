import type { ComponentType } from "react";
import type { BoardGeometry } from "../../modules/throneworld/shared/models/BoardGeometry.ThroneWorld.ts";

export interface FrontendModuleDefinition {
  StaticBoardLayer?: ComponentType<{ gameState: any; boardGeometry?: BoardGeometry }>;
}
