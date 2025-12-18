// /modules/FrontendModuleDefinition.ts
import type { GameAction } from "../shared/models/ApiContexts";
import type { GameDefinition } from "../shared/models/GameDefinition";
import type { GameState } from "../shared/models/GameState";
import type InspectContext from "../shared/models/InspectContext";
import type { BoardGeometry } from "../shared/models/BoardGeometry";

export type VictoryPoints = Record<string, number>;

export interface FrontendModuleDefinition<State = unknown, InspectPayload = unknown> {
  getGameDefinition(): GameDefinition;
  getBoardGeometry(gameState: GameState<State>): BoardGeometry;
  getVictoryPoints(params: { gameState: GameState<State> }): VictoryPoints;

  MainBoardComponent?: React.ComponentType<{
    gameState: GameState<State>;
    boardGeometry?: BoardGeometry;
    onInspect?: (context: InspectContext<InspectPayload> | null) => void;
    legalActions?: GameAction[];
    onExecuteAction: (action: GameAction) => void;
  }>;

  MessagePanelComponent?: React.ComponentType;

  PlayerAreaComponent?: React.ComponentType<{ playerId: string }>;
  GameInfoAreaComponent?: React.ComponentType<Record<never, never>>;
  InfoPanelComponent?: React.ComponentType<{ inspected: InspectContext<InspectPayload> | null }>;
  ActionInterfaceComponent?: React.ComponentType<{
    actions: GameAction[];
    message?: string;
    onExecuteAction: (action: GameAction) => void;
    executing: boolean;
  }>;
}
