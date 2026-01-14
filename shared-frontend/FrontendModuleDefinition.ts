// /modules/FrontendModuleDefinition.ts
import type { GameDefinition } from "../shared/models/GameDefinition";
import type { GameState } from "../shared/models/GameState";
import type InspectContext from "./InspectContext";
import type { BoardGeometry } from "../shared/models/BoardGeometry";
import type { ActionParam, GameAction, LegalChoice } from "../shared/models/GameAction";

export type VictoryPoints = Record<string, number>;

export interface ChoiceRendererProps {
  choice: LegalChoice;
  playerId?: string;
  onClick: () => void;
}

export interface ParameterRendererProps {
  action: GameAction;
  param: ActionParam<string[]>;
  value: string[];
  playerId: string;
  onChange: (value: any) => void;
}

export interface FrontendModuleDefinition<State = unknown, InspectPayload = unknown> {
  getGameDefinition(): GameDefinition;
  getBoardGeometry(gameState: GameState<State>): BoardGeometry;
  getVictoryPoints(params: { gameState: GameState<State> }): VictoryPoints;

  MainBoardComponent?: React.ComponentType<{
    boardGeometry?: BoardGeometry;
    onInspect?: (context: InspectContext<InspectPayload> | null) => void;
  }>;

  PlayerAreaComponent?: React.ComponentType<{ playerId: string }>;
  GameInfoAreaComponent?: React.ComponentType<Record<never, never>>;
  InfoPanelComponent?: React.ComponentType<{ inspected: InspectContext<InspectPayload> | null }>;

  parameterRenderers?: Record<string, React.ComponentType<ParameterRendererProps>>;
  choiceRenderers?: Record<string, React.ComponentType<ChoiceRendererProps>>;

  animations?: Record<string, React.ComponentType<any>>;
}
