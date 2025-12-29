// /modules/FrontendModuleDefinition.ts
import type { GameDefinition } from "../shared/models/GameDefinition";
import type { GameState } from "../shared/models/GameState";
import type InspectContext from "../shared/models/InspectContext";
import type { BoardGeometry } from "../shared/models/BoardGeometry";
import type { LegalChoice } from "../shared/models/GameAction";

export type VictoryPoints = Record<string, number>;

export interface ChoiceRendererProps {
  choice: LegalChoice;
  onClick: () => void;
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

  choiceRenderers?: Record<string, React.ComponentType<ChoiceRendererProps>>;
}
