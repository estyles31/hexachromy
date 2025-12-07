import type { ComponentType } from "react";

export interface HoveredSystemInfo {
  hexId: string;
  worldType?: string;
  details?: unknown;
  revealed?: boolean;
}

export interface FrontendModuleDefinition {
  StaticBoardLayer?: ComponentType<{ gameState: any; boardGeometry?: unknown }>;
  SpaceLayer?: ComponentType<{
    gameState: any;
    boardGeometry?: unknown;
    onHoverSystem?: (info: HoveredSystemInfo | null) => void;
  }>;
  PlayerArea?: ComponentType<{ gameState: any }>;
  InfoPanel?: ComponentType<{ gameState: any; hoveredSystem: HoveredSystemInfo | null }>;
  getBoardGeometry?: (gameState: any) => {
    boardGeometry?: unknown;
    width?: number;
    height?: number;
  };
}
