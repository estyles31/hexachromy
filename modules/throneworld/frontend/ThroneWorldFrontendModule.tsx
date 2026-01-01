// /modules/throneworld/frontend/ThroneWorldFrontendModule.tsx
import ThroneworldInfoPanel from "./components/ThroneworldInfoPanel";
import ThroneworldPlayerArea from "./components/ThroneworldPlayerArea";
import ThroneworldGameInfoArea from "./components/ThroneworldGameInfoArea";
import type { ThroneworldGameState, ThroneworldState } from "../shared/models/GameState.Throneworld";
import { computeBoardGeometry, type ThroneworldBoardGeometry } from "../shared/models/BoardGeometry.ThroneWorld";

import type { FrontendModuleDefinition } from "../../../shared-frontend/FrontendModuleDefinition";
import type InspectContext from "../../../shared/models/InspectContext";
import type { GameState } from "../../../shared/models/GameState";
import type { HoveredInfo } from "./models/HoveredInfo";
import type { VictoryPoints } from "../../../shared-frontend/FrontendModuleDefinition";
import { ThroneworldGameDefinition } from "../shared/models/GameDefinition.Throneworld";
import type { BoardGeometry } from "../../../shared/models/BoardGeometry";
import ThroneworldBoard from "./components/ThroneworldBoard";
import ThroneworldUnitCounterButton from "./components/ThroneworldUnitCounterButton";

export const ThroneworldFrontendModule: FrontendModuleDefinition<ThroneworldState, HoveredInfo> = {
  getBoardGeometry: (gameState: ThroneworldGameState) => {
    const geometry = computeBoardGeometry(String(gameState.options.scenario));
    return geometry;
  },
  getGameDefinition: () => ThroneworldGameDefinition,
  MainBoardComponent,
  PlayerAreaComponent: ThroneworldPlayerArea,
  GameInfoAreaComponent: ThroneworldGameInfoArea,
  InfoPanelComponent: ThroneworldInfoPanel,
  getVictoryPoints,
  choiceRenderers: { 
    "unitType": ThroneworldUnitCounterButton
  }
};

function MainBoardComponent(params: {
  boardGeometry?: BoardGeometry;
  onInspect?: (context: InspectContext<HoveredInfo> | null) => void;
}) {
  const geometry = params.boardGeometry as ThroneworldBoardGeometry;

  if (!geometry || !geometry.hexes) {
    return <div>ERROR RENDERING BOARD</div>;
  }

  return (
      <ThroneworldBoard
        boardGeometry={geometry}
        onInspect={params.onInspect}
      />
  );
}

function getVictoryPoints(params: { gameState: GameState<ThroneworldState> }) {
  const vp: VictoryPoints = {};
  const gameState = params.gameState as ThroneworldGameState;

  Object.entries(gameState.players).map(([playerId]) => {
    vp[playerId] = 1;
  });

  return vp;
}
