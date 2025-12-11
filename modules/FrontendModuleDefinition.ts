import type { GameAction } from "../shared/models/ApiContexts";
import type { GameDefinition } from "../shared/models/GameDefinition";
import type { GameState } from "../shared/models/GameState";
import type InspectContext from "../shared/models/InspectContext";
import type { BoardGeometry } from "../shared/models/BoardGeometry";

export type VictoryPoints = Record<string, number>;

export interface FrontendModuleDefinition<State, InspectPayload = unknown> {
  getGameDefinition() : GameDefinition;
  getBoardGeometry(gameState: GameState<State>): BoardGeometry;

  renderBoard(params: {
    gameState: GameState<State>;
    boardGeometry?: unknown;
    onInspect?: (context: InspectContext<InspectPayload> | null) => void;
  }): React.JSX.Element;

  getVictoryPoints(params: { gameState: GameState<State> }): VictoryPoints;

  renderPlayerArea?: (params: {
    gameState: GameState<State>;
    playerId: string;
  }) => React.JSX.Element;

  renderGameInfoArea?: (params:{
    gameState: GameState<State>;
  }) => React.JSX.Element;

  renderInfoPanel?: (params:{
    gameState: GameState<State>;
    inspected: InspectContext<InspectPayload> | null;
  }) => React.JSX.Element;

  renderActions?: (params:{
    actions : GameAction[],
    message?: string,
    onExecuteAction: (action: GameAction) => void,
    executing: boolean,
  }) => React.JSX.Element;
}
