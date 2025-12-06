import type { ComponentType } from "react";

export interface FrontendModuleDefinition {
  StaticBoardLayer?: ComponentType<{ gameState: any; boardGeometry?: unknown }>;
  SpaceLayer?: ComponentType<{
    gameState: any;
    boardGeometry?: unknown;
    selectedSystem: string | null;
    onSelectSystem: (system: string) => void;
  }>;
  getBoardGeometry?: (gameState: any) => {
    boardGeometry?: unknown;
    width?: number;
    height?: number;
  };
}
