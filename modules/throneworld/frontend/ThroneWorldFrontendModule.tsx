// /modules/throneworld/frontend/ThroneworldFrontendModule.tsx
import ThroneworldInfoPanel from "./components/ThroneworldInfoPanel";
import ThroneworldPlayerArea from "./components/ThroneworldPlayerArea";
import ThroneworldGameInfoArea from "./components/ThroneworldGameInfoArea";
import type { ThroneworldGameState, ThroneworldState } from "../shared/models/GameState.Throneworld";
import { computeBoardGeometry, type ThroneworldBoardGeometry } from "../shared/models/BoardGeometry.ThroneWorld";

import type { FrontendModuleDefinition } from "../../FrontendModuleDefinition";
import type InspectContext from "../../../shared/models/InspectContext";
import type { GameState } from "../../../shared/models/GameState";
import type HoveredSystemInfo from "./models/HoveredSystemInfo";
import type { VictoryPoints } from "../../FrontendModuleDefinition";
import { ThroneworldGameDefinition } from "../shared/models/GameDefinition.Throneworld";
import type { BoardGeometry } from "../../../shared/models/BoardGeometry";
import ThroneworldBoard from "./components/ThroneworldBoard";


export const ThroneworldFrontendModule: FrontendModuleDefinition<ThroneworldState, HoveredSystemInfo> = {
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
};

function MainBoardComponent(params: {
  gameState: GameState<ThroneworldState>;
  boardGeometry?: BoardGeometry;
  onInspect?: (context: InspectContext<HoveredSystemInfo> | null) => void;
}) {
  const onInspect = params.onInspect;
  const gameState = params.gameState as ThroneworldGameState;
  const geometry = params.boardGeometry as ThroneworldBoardGeometry;

  if (!geometry || !geometry.hexes) {
    return <div>ERROR RENDERING BOARD</div>;
  }

  return (
    <ThroneworldBoard 
      gameState={gameState}
      boardGeometry={geometry}
      onInspect={onInspect}
    />
  );
}

function getVictoryPoints(params: { gameState: GameState<ThroneworldState> }) {
  const vp: VictoryPoints = {};
  const gameState = params.gameState as ThroneworldGameState;

  //todo: calculate vps
  Object.entries(gameState.players).map(([playerId]) => {
    vp[playerId] = 1;
  });

  return vp;
}